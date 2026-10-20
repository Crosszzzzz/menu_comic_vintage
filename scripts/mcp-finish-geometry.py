import bpy, bmesh, math, json, numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
root=Path(__file__).resolve().parents[1]
for name,z in [('Pan_Inferior',.003),('Pan_Superior',-.026)]:
    obj=bpy.data.objects[name]
    bm=bmesh.new(); bm.from_mesh(obj.data)
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,z),plane_no=(0,0,1),clear_inner=True)
    bm.to_mesh(obj.data); bm.free(); obj.data.update()

# Resample only the best scanned tomato slice. UVs come from the original scan.
# The reverse is an explicit mirrored reconstruction, never claimed as scanned.
old=bpy.data.objects['Tomate']
bpy.ops.wm.obj_import(filepath=str(root/'artifacts/blender/source/Tomate/Tomate.obj'))
raw=bpy.context.selected_objects[0]
bpy.context.view_layer.objects.active=raw
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
mesh=raw.data; mesh.calc_loop_triangles()
triangles=list(mesh.loop_triangles)
coords=[v.co.copy() for v in mesh.vertices]
tree=BVHTree.FromPolygons(coords,[tuple(t.vertices) for t in triangles],all_triangles=True)
uvs=mesh.uv_layers.active.data
poly_px=[(240,162),(247,123),(265,92),(295,65),(328,53),(370,49),(405,55),(436,77),(461,101),(480,132),(487,163),(485,203),(471,238),(448,259),(416,274),(378,281),(340,276),(300,262),(270,239),(249,208),(240,181)]
size=.413715988*1.15
poly=[Vector(((x-320)*size/640,(320-y)*size/640)) for x,y in poly_px]
center=sum(poly,Vector((0,0)))/len(poly)
def sample(x,y):
    hit,normal,index,distance=tree.ray_cast(Vector((x,y,.2)),Vector((0,0,-1)))
    if hit is None: hit,normal,index,distance=tree.find_nearest(Vector((x,y,.012)))
    tri=triangles[index]
    uv=barycentric_transform(hit,*[coords[i] for i in tri.vertices],*[Vector((*uvs[i].uv,0)) for i in tri.loops])
    return hit.z,(uv.x,uv.y)
angles=160; rings=40
boundary=[]
for i in range(angles):
    direction=Vector((math.cos(2*math.pi*i/angles),math.sin(2*math.pi*i/angles)))
    distances=[]
    for a,b in zip(poly,poly[1:]+poly[:1]):
        delta=b-a
        cross=direction.x*delta.y-direction.y*delta.x
        if abs(cross)<1e-9: continue
        diff=a-center
        t=(diff.x*delta.y-diff.y*delta.x)/cross
        u=(diff.x*direction.y-diff.y*direction.x)/cross
        if t>0 and 0<=u<=1: distances.append(t)
    boundary.append(center+direction*min(distances)*.975)
rim=np.array([(p.x,p.y,sample(p.x,p.y)[0]) for p in boundary])
plane=np.linalg.lstsq(np.column_stack((rim[:,:2],np.ones(angles))),rim[:,2],rcond=None)[0]
verts=[]; uv=[]
def add(p):
    z,tex=sample(p.x,p.y)
    height=max(.0015,z-(plane[0]*p.x+plane[1]*p.y+plane[2])+.007)
    verts.append((p.x-center.x,p.y-center.y,height)); uv.append(tex)
add(center)
for ring in range(1,rings+1):
    for p in boundary: add(center+(p-center)*ring/rings)
faces=[]
for i in range(angles): faces.append((0,1+i,1+(i+1)%angles))
for ring in range(1,rings):
    for i in range(angles):
        a=1+(ring-1)*angles+i; b=1+(ring-1)*angles+(i+1)%angles
        c=1+ring*angles+(i+1)%angles; d=1+ring*angles+i
        faces.extend([(a,b,c),(a,c,d)])
offset=len(verts)
verts.extend([(x,y,-z) for x,y,z in list(verts)]); uv.extend(list(uv))
faces.extend([tuple(v+offset for v in reversed(f)) for f in list(faces)])
for i in range(angles):
    a=1+(rings-1)*angles+i; b=1+(rings-1)*angles+(i+1)%angles
    faces.append((a,a+offset,b+offset,b))
new=bpy.data.meshes.new('Tomate — rodaja y reverso reconstruido')
new.from_pydata(verts,[],faces); new.update()
layer=new.uv_layers.new(name='UVMap')
for loop in new.loops: layer.data[loop.index].uv=uv[loop.vertex_index]
new.materials.append(raw.data.materials[0])
old.data=new
bpy.data.objects.remove(raw,do_unlink=True)

mapping={'Hamburguesa_De_Huevo':('burger',.12,35000),'Pan_Inferior':('bottom-bun',.115,11000),'Huevo':('egg',.112,12000),'Tomate':('tomato',.083,12000),'Pan_Superior':('top-bun',.12,15000)}
stats={}
for name,(key,width,target) in mapping.items():
    obj=bpy.data.objects[name]
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
    for mat in obj.data.materials:
        mat.use_backface_culling=True
        for node in mat.node_tree.nodes:
            if node.type=='BSDF_PRINCIPLED':
                node.inputs['Roughness'].default_value=.8
                for link in list(mat.node_tree.links):
                    if link.to_socket==node.inputs['Normal']: mat.node_tree.links.remove(link)
    modifier=obj.modifiers.new('Mobile mesh','DECIMATE'); modifier.ratio=min(1,target/len(obj.data.polygons))
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    for f in obj.data.polygons: f.use_smooth=True
    points=[v.co for v in obj.data.vertices]
    lo=Vector([min(v[i] for v in points) for i in range(3)]); hi=Vector([max(v[i] for v in points) for i in range(3)])
    scale=width/(hi.x-lo.x); center=(lo+hi)/2
    for v in obj.data.vertices: v.co=Vector(((v.co.x-center.x)*scale,(v.co.y-center.y)*scale,(v.co.z-lo.z)*scale))
    obj.name=key; obj.location=(0,0,0); obj.data.update()
    stats[key]={'triangles':len(obj.data.polygons),'widthMeters':width,'heightMeters':(hi.z-lo.z)*scale,'underside':'mirrored top scan' if key=='tomato' else 'open; not scanned'}
(root/'artifacts/blender/geometry-report.json').write_text(json.dumps(stats,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(root/'artifacts/blender/food-clean.blend'))
print(json.dumps(stats))
