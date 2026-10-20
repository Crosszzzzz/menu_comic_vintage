"""Rebuild closed food volumes from the scanned upper surfaces, via Blender MCP."""
import bpy, bmesh, math, json, numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import convex_hull_2d
from mathutils.noise import noise_vector

root=Path(__file__).resolve().parents[1]
# Start from the retained first-delivery scene so repeated runs are deterministic.
backup=root/'artifacts/blender/menu-before-closed.blend'
if not backup.exists(): bpy.ops.wm.save_as_mainfile(filepath=str(backup))
else: bpy.ops.wm.open_mainfile(filepath=str(backup))
scene=bpy.context.scene
scene.frame_set(1)
foods=[bpy.data.objects[n] for n in ['top-bun','bottom-bun','egg','tomato']]
for o in scene.objects:
    if o.type=='MESH': o.hide_render=True
for o in foods:
    o.animation_data_clear(); o.location=(0,0,0); o.hide_set(False)

def material(name,image):
    mat=bpy.data.materials.new(name); mat.use_nodes=True; mat.use_backface_culling=True
    bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value=.92
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=image
    mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    return mat

crumb_image=bpy.data.images.load(str(root/'artifacts/blender/bread-crumb-source.png'),check_existing=True)
crumb_image.scale(1024,1024)
camera_data=bpy.data.cameras.new('Surface bake'); camera=bpy.data.objects.new('Surface bake',camera_data)
scene.collection.objects.link(camera); scene.camera=camera
camera_data.type='ORTHO'; camera.rotation_euler=(0,0,0)
scene.render.engine='CYCLES'; scene.cycles.samples=8
scene.render.resolution_x=1024; scene.render.resolution_y=1024; scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard'; scene.render.image_settings.file_format='PNG'
reports={}

def organic(x,y,scale=160,seed=0):
    return noise_vector(Vector((x*scale+seed,y*scale-seed,2.71))).x

for name in ['top-bun','bottom-bun','egg']:
    obj=bpy.data.objects[name]; obj.hide_render=False
    mesh=obj.data; mesh.calc_loop_triangles()
    coords=[v.co.copy() for v in mesh.vertices]
    xy=[Vector((v.x,v.y)) for v in coords]
    hull=[xy[i] for i in convex_hull_2d(xy)]
    lo=Vector((min(p.x for p in xy),min(p.y for p in xy)))
    hi=Vector((max(p.x for p in xy),max(p.y for p in xy)))
    center=(lo+hi)/2; extent=max(hi-lo)*1.02
    tree=BVHTree.FromPolygons(coords,[tuple(t.vertices) for t in mesh.loop_triangles],all_triangles=True)
    def sample(p):
        hit,_,_,_=tree.ray_cast(Vector((p.x,p.y,.3)),Vector((0,0,-1)))
        if hit is None: hit,_,_,_=tree.find_nearest(Vector((p.x,p.y,.01)))
        return hit.z
    # Bake scanned color before replacing geometry. All materials are restored.
    restores=[]
    for mat in mesh.materials:
        nt=mat.node_tree
        tex=next(n for n in nt.nodes if n.type=='TEX_IMAGE' and n.image and 'diffuse' in n.image.name)
        output=next(n for n in nt.nodes if n.type=='OUTPUT_MATERIAL')
        previous=output.inputs['Surface'].links[0].from_socket
        emit=nt.nodes.new('ShaderNodeEmission'); nt.links.new(tex.outputs['Color'],emit.inputs['Color']); nt.links.new(emit.outputs[0],output.inputs['Surface'])
        restores.append((nt,output,previous,emit))
    camera.location=(center.x,center.y,.4); camera_data.ortho_scale=extent
    scene.render.filepath=str(root/'artifacts/blender'/f'{name}-surface.png')
    bpy.ops.render.render(write_still=True)
    for nt,output,previous,emit in restores:
        nt.links.new(previous,output.inputs['Surface']); nt.nodes.remove(emit)
    scanned_image=bpy.data.images.load(scene.render.filepath,check_existing=False)
    outer_mat=material(name+'-scanned',scanned_image)
    inner_mat=material(name+'-cut-crumb',crumb_image) if name!='egg' else material('egg-underside',scanned_image)
    if name=='egg':
        bsdf=next(n for n in inner_mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        tex=next(n for n in inner_mat.node_tree.nodes if n.type=='TEX_IMAGE')
        mix=inner_mat.node_tree.nodes.new('ShaderNodeMixRGB'); mix.blend_type='MULTIPLY'; mix.inputs[0].default_value=.45; mix.inputs[2].default_value=(.64,.42,.18,1)
        inner_mat.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]); inner_mat.node_tree.links.new(mix.outputs[0],bsdf.inputs['Base Color'])
    angles=128; rings=32
    radii=[]
    for i in range(angles):
        d=Vector((math.cos(2*math.pi*i/angles),math.sin(2*math.pi*i/angles)))
        hits=[]
        for a,b in zip(hull,hull[1:]+hull[:1]):
            delta=b-a; cross=d.x*delta.y-d.y*delta.x
            if abs(cross)<1e-9: continue
            diff=a-center; t=(diff.x*delta.y-diff.y*delta.x)/cross; u=(diff.x*d.y-diff.y*d.x)/cross
            if t>0 and 0<=u<=1: hits.append(t)
        radii.append(min(hits)*.965)
    for _ in range(2): radii=[(radii[i-1]+2*radii[i]+radii[(i+1)%angles])/4 for i in range(angles)]
    # Uneven natural perimeter; keep it inside the photographed food silhouette.
    for i in range(angles):
        a=2*math.pi*i/angles; x=math.cos(a)*radii[i]; y=math.sin(a)*radii[i]
        strength=.052 if name=='egg' else .026
        radii[i]*=1-strength+strength*organic(x,y,190,3)+strength*.36*organic(x,y,510,9)
    boundary=[center+Vector((math.cos(2*math.pi*i/angles),math.sin(2*math.pi*i/angles)))*radii[i] for i in range(angles)]
    rim=np.array([(p.x,p.y,sample(center+(p-center)*.9)) for p in boundary])
    plane=np.linalg.lstsq(np.column_stack((rim[:,:2],np.ones(angles))),rim[:,2],rcond=None)[0]
    vertices=[]; uv=[]; faces=[]; materials=[]
    def add(p,r):
        sampled=sample(p)
        if name=='egg':
            height=max(.002,sampled-(plane[0]*p.x+plane[1]*p.y+plane[2])+.004)
            height=min(height,.012)+.00045*organic(p.x,p.y,410,2)
        else:
            height=max(.005,sampled+.004)
            # A continuous rounded rim removes torn scan edges while retaining the dome.
            t=max(0,(r-.88)/.12)
            height=height*(1-t)+(.0025+.00065*organic(p.x,p.y,350,4))*t
            height+=.00018*organic(p.x,p.y,660,1)
        vertices.append((p.x-center.x,p.y-center.y,height))
        uv.append(((p.x-center.x)/extent+.5,(p.y-center.y)/extent+.5))
    add(center,0)
    for ring in range(1,rings+1):
        for p in boundary: add(center+(p-center)*ring/rings,ring/rings)
    for i in range(angles): faces.append((0,1+i,1+(i+1)%angles)); materials.append(0)
    for ring in range(1,rings):
        for i in range(angles):
            a=1+(ring-1)*angles+i; b=1+(ring-1)*angles+(i+1)%angles
            c=1+ring*angles+(i+1)%angles; d=1+ring*angles+i
            faces.extend([(a,b,c),(a,c,d)]); materials.extend([0,0])
    # A tessellated, gently uneven cut face: no perfect planar lid or razor rim.
    base_center=len(vertices)
    def add_base(p):
        x=p.x-center.x; y=p.y-center.y
        height=.0006*organic(x,y,90,7)+.00025*organic(x,y,420,6)
        if name!='egg': height+=.00012*organic(x,y,1100,8)
        vertices.append((x,y,height)); uv.append((x/extent+.5,y/extent+.5))
    add_base(center)
    base_rings=24
    for ring in range(1,base_rings+1):
        for p in boundary: add_base(center+(p-center)*ring/base_rings)
    for i in range(angles):
        faces.append((base_center,base_center+1+(i+1)%angles,base_center+1+i)); materials.append(1)
    for ring in range(1,base_rings):
        for i in range(angles):
            a=base_center+1+(ring-1)*angles+i; b=base_center+1+(ring-1)*angles+(i+1)%angles
            c=base_center+1+ring*angles+(i+1)%angles; d=base_center+1+ring*angles+i
            faces.extend([(a,c,b),(a,d,c)]); materials.extend([1,1])
    base_start=base_center+1+(base_rings-1)*angles
    for i in range(angles):
        a=1+(rings-1)*angles+i; b=1+(rings-1)*angles+(i+1)%angles
        faces.append((a,base_start+i,base_start+(i+1)%angles,b)); materials.append(0 if name!='egg' else 1)
    new=bpy.data.meshes.new(name+' closed volume'); new.from_pydata(vertices,[],faces); new.update()
    new.materials.append(outer_mat); new.materials.append(inner_mat)
    layer=new.uv_layers.new(name='UVMap')
    for loop in new.loops: layer.data[loop.index].uv=uv[loop.vertex_index]
    for f,index in zip(new.polygons,materials): f.material_index=index; f.use_smooth=True
    obj.data=new
    if name=='bottom-bun':
        height=max(v.co.z for v in new.vertices)
        for v in new.vertices: v.co.y=-v.co.y; v.co.z=height-v.co.z
    bm=bmesh.new(); bm.from_mesh(new); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(new)
    reports[name]={'boundaryEdges':sum(e.is_boundary for e in bm.edges),'nonManifoldEdges':sum(not e.is_manifold for e in bm.edges),'volume':bm.calc_volume(),'height':max(v.co.z for v in bm.verts)-min(v.co.z for v in bm.verts)}
    bm.free(); obj.hide_render=True

tomato=bpy.data.objects['tomato']; tomato.hide_render=True
for v in tomato.data.vertices:
    v.co*=.057/.083
    x,y,z=v.co
    irregularity=1+.018*organic(x,y,180,3)+.008*organic(x,y,650,8)
    v.co.x*=irregularity; v.co.y*=irregularity
    v.co.z+=.00035*organic(x,y,150,5)+.00012*organic(x,y,540,1)
tomato.data.update()
second=tomato.copy(); second.data=tomato.data.copy(); scene.collection.objects.link(second); second.name='tomato-2'
# Same scanned slice, with a subtly different bend and orientation for the second.
for v in second.data.vertices:
    v.co.z+=.00022*organic(v.co.x,v.co.y,210,12)
second.rotation_euler.z=.23
for obj in [tomato,second]:
    bm=bmesh.new(); bm.from_mesh(obj.data)
    reports[obj.name]={'boundaryEdges':sum(e.is_boundary for e in bm.edges),'nonManifoldEdges':sum(not e.is_manifold for e in bm.edges),'volume':bm.calc_volume()}
    bm.free()
bpy.data.objects.remove(camera,do_unlink=True)
for item in reports.values(): assert item['boundaryEdges']==0 and item['nonManifoldEdges']==0 and item['volume']>0, item
(root/'artifacts/blender/closed-geometry-report.json').write_text(json.dumps(reports,indent=2))
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(root/'artifacts/blender/menu-ingredientes-cerrados.blend'))
print(json.dumps(reports))
