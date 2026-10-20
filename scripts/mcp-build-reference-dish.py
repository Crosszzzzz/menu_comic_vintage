"""Split an authoritative assembled scan, retaining its surface and UVs.

An asset recipe supplies anatomical seam annotations and reconstruction sources.
The algorithm never resamples the photographed exterior into a convex hull.
Run through Blender MCP with --recipe scripts/recipes/<dish>.json.
"""
import bpy,bmesh,json,math,colorsys,numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import tessellate_polygon
root=Path(__file__).resolve().parents[1]
recipe_path=Path(globals().get('RECIPE_PATH',root/'scripts/recipes/egg-tomato.json'))
recipe=json.loads(recipe_path.read_text(encoding='utf-8'))
manifest=json.loads((root/recipe['manifest']).read_text(encoding='utf-8'))
out=root/recipe['output'];out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(root/recipe['source']['blend']))
source=bpy.data.objects[recipe['source']['object']]
source.animation_data_clear();source.location=(0,0,0)
bpy.context.view_layer.objects.active=source
guides=json.loads((root/recipe['seams']).read_text(encoding='utf-8'))['curves']
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH' and obj!=source:bpy.data.objects.remove(obj,do_unlink=True)
source.hide_render=True;source.hide_set(True)

def height(key,p):
    data=guides[key];a=math.atan2(p.y,p.x)%(2*math.pi)
    samples=np.array(data['samples']);z=float(np.interp(a,samples[:,0],samples[:,1]))
    # The annotated edge evolves to a central interior height without a pole.
    r=math.hypot(p.x,p.y);blend=min(1,r/recipe.get('seamRadius',.047))
    blend=blend*blend*(3-2*blend)
    return data['centerHeight']*(1-blend)+z*blend

def cut(bm,key,keep_above):
    original=bm.verts.layers.float_vector.get('original_position') or bm.verts.layers.float_vector.new('original_position')
    for v in bm.verts:
        v[original]=v.co.copy();v.co.z-=height(key,v.co)
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-8,plane_co=(0,0,0),plane_no=(0,0,1),clear_inner=keep_above,clear_outer=not keep_above)
    for v in bm.verts:v.co=v[original]
    bm.verts.layers.float_vector.remove(original)

images={}
def image(path):
    if path not in images:images[path]=bpy.data.images.load(str(root/path),check_existing=True)
    return images[path]

source_mat=source.data.materials[0]
source_image=next(n.image for n in source_mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and 'diffuse' in n.image.name)
source.data.calc_loop_triangles()
reference_tree=BVHTree.FromPolygons([v.co.copy() for v in source.data.vertices],[tuple(t.vertices) for t in source.data.loop_triangles],all_triangles=True)
def material(name,picture,roughness,tint=None):
    mat=bpy.data.materials.new(name);mat.use_nodes=True;mat.use_backface_culling=True
    nt=mat.node_tree;shader=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED')
    shader.inputs['Roughness'].default_value=roughness
    shader.inputs['Specular IOR Level'].default_value=.23
    tex=nt.nodes.new('ShaderNodeTexImage');tex.image=picture
    if tint:
        mix=nt.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*tint,1)
        nt.links.new(tex.outputs['Color'],mix.inputs[1]);nt.links.new(mix.outputs[0],shader.inputs['Base Color'])
    else:nt.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
    return mat

report={'dish':manifest['id'],'referenceVertices':len(source.data.vertices),'referenceFaces':len(source.data.polygons),'parts':{}}
def separate_pinches(bm):
    """Give touching boundary loops independent vertex fans before capping."""
    bm.verts.index_update();bm.faces.index_update()
    ownership={};has_pinches=False
    for v in bm.verts:
        if sum(e.is_boundary for e in v.link_edges)<=2:continue
        remaining_faces=set(v.link_faces);group=0
        while remaining_faces:
            seed=remaining_faces.pop();pending=[seed]
            while pending:
                face=pending.pop();ownership[(v.index,face.index)]=group
                for edge in v.link_edges:
                    if face not in edge.link_faces or len(edge.link_faces)!=2:continue
                    for neighbor in edge.link_faces:
                        if neighbor in remaining_faces:remaining_faces.remove(neighbor);pending.append(neighbor)
            group+=1
        has_pinches=has_pinches or group>1
    if not has_pinches:return bm
    new=bmesh.new();newuv=new.loops.layers.uv.new('UVMap');old_uv=bm.loops.layers.uv.active
    newtag=new.faces.layers.int.new('photographed_surface');oldtag=bm.faces.layers.int.get('photographed_surface');verts={}
    for face in bm.faces:
        points=[]
        for loop in face.loops:
            key=(loop.vert.index,ownership.get((loop.vert.index,face.index),0))
            if key not in verts:verts[key]=new.verts.new(loop.vert.co)
            points.append(verts[key])
        f=new.faces.new(points);f[newtag]=face[oldtag];f.material_index=face.material_index
        for target,source_loop in zip(f.loops,face.loops):target[newuv].uv=source_loop[old_uv].uv
    bm.free();return new

objects=[]
donors={}
def complete_with_donor(obj,layer,spec):
    """Register a closed donor behind the incomplete photographed rind.

    Keep both closed shells in one ingredient mesh, retaining the reference UVs
    without fragile boolean operations on intersecting photogrammetry folds.
    """
    completion=layer.get('completion')
    if not completion:return
    key=(completion['blend'],completion['object'])
    if key not in donors:
        with bpy.data.libraries.load(str(root/key[0]),link=False) as (available,loaded):loaded.objects=[key[1]]
        donors[key]=loaded.objects[0]
    donor=donors[key];mesh=donor.data.copy()
    coords=np.array([tuple(v.co) for v in mesh.vertices]);lo=coords.min(axis=0);hi=coords.max(axis=0)
    coords=(coords-(lo+hi)/2)/(hi-lo)
    pose=spec['completion'];diameter=pose['diameter'];thickness=pose['thickness'];slope=pose['slope']
    for v,p in zip(mesh.vertices,coords):
        x=p[0]*diameter;y=p[1]*diameter
        v.co=(spec['center'][0]+x,spec['center'][1]+y,pose['centerZ']+p[2]*thickness+slope[0]*x+slope[1]*y)
    for i,mat in enumerate(list(mesh.materials)):
        copied=mat.copy();copied.name=spec['id']+'-donor-'+str(i);mesh.materials[i]=copied
        shader=next(n for n in copied.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        shader.inputs['Roughness'].default_value=.68
        for link in list(shader.inputs['Normal'].links):copied.node_tree.links.remove(link)
    target=bmesh.new();target.from_mesh(obj.data);target_uv=target.loops.layers.uv.active
    donor_mesh=bmesh.new();donor_mesh.from_mesh(mesh);donor_uv=donor_mesh.loops.layers.uv.active
    mapping={v:target.verts.new(v.co) for v in donor_mesh.verts};offset=len(obj.data.materials)
    for mat in mesh.materials:obj.data.materials.append(mat)
    for face in donor_mesh.faces:
        new=target.faces.new([mapping[v] for v in face.verts]);new.material_index=offset+face.material_index;new.smooth=True
        for a,b in zip(new.loops,face.loops):a[target_uv].uv=b[donor_uv].uv
    target.to_mesh(obj.data);target.free();donor_mesh.free();bpy.data.meshes.remove(mesh)

def seal_loops(bm):
    """Close simple boundary loops with fresh interior edges, avoiding atlas seams
    becoming shared triangulation diagonals or non-manifold sliver faces."""
    pending={e for e in bm.edges if e.is_boundary};added=[]
    while pending:
        edge=pending.pop();first,current=edge.verts;loop=[first,current]
        while current!=first:
            choices=[e for e in current.link_edges if e in pending]
            if not choices:break
            edge=choices[0];pending.remove(edge);current=edge.other_vert(current)
            if current!=first:loop.append(current)
        assert current==first,'Boundary must form an independent simple loop'
        center=sum((v.co for v in loop),Vector())/len(loop)
        coords=np.array([tuple(v.co-center) for v in loop]);_,_,axes=np.linalg.svd(coords,full_matrices=False)
        inner=[bm.verts.new(center+(v.co-center)*.9995) for v in loop]
        for i in range(len(loop)):
            j=(i+1)%len(loop)
            added.append(bm.faces.new((loop[i],loop[j],inner[j],inner[i])))
        # Keep vertex identity through Blender's BMesh tessellator. Coordinate
        # lookup loses distinct atlas vertices which project to the same point.
        cap=bm.faces.new(inner)
        added.extend(bmesh.ops.triangulate(bm,faces=[cap],ngon_method='BEAUTY')['faces'])
    # Coincident scan vertices can project to the same point. Close only the
    # tiny residual slivers omitted by the planar tessellator.
    residual=[e for e in bm.edges if e.is_boundary]
    if residual:added.extend(bmesh.ops.holes_fill(bm,edges=residual,sides=0)['faces'])
    return added

regions={}
remaining=bmesh.new();remaining.from_mesh(source.data)
initial_tag=remaining.faces.layers.int.new('photographed_surface')
for face in remaining.faces:face[initial_tag]=1
if recipe.get('occludedInteriorRadius'):
    hidden=[]
    for face in remaining.faces:
        p=face.calc_center_median()
        if p.z>=height(recipe['layers'][-1]['lower'],p)-.001:continue
        radius=math.hypot(p.x,p.y)
        occluded=radius<recipe['occludedInteriorRadius']
        if recipe.get('radialVisibilityTolerance') and radius>1e-5:
            direction=Vector((p.x/radius,p.y/radius,0))
            hit=reference_tree.ray_cast(p+direction*.25,-direction)[0]
            occluded=occluded or (hit is not None and (hit-p).length>recipe['radialVisibilityTolerance'])
        if occluded:hidden.append(face)
    bmesh.ops.delete(remaining,geom=hidden,context='FACES')
previous_upper=None
for layer in recipe['layers']:
    assert layer.get('lower')==previous_upper,'Recipe layers must share successive seams, bottom to top'
    bm=remaining.copy();scan=bm.faces.layers.int.get('photographed_surface')
    if layer.get('upper'):
        cut(bm,layer['upper'],False);cut(remaining,layer['upper'],True)
    previous_upper=layer.get('upper')
    if layer.get('baseTrim') is not None:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-8,plane_co=(0,0,layer['baseTrim']),plane_no=(0,0,1),clear_inner=True)
    for f in bm.faces:f.material_index=0
    regions[layer['id']]=bm
remaining.free()

# Optional color evidence resolves overlapping folds that a height guide alone
# cannot distinguish. Reassign photographed faces, never replace their texture.
color_path=out/'reference-colors.rgb'
colors=np.fromfile(color_path,dtype=np.uint8).reshape(1024,1024,3) if color_path.exists() else None
for layer in recipe['layers']:
    rule=layer.get('colorOwnership')
    if not rule:continue
    assert colors is not None,'Run build-dish.mjs to prepare the reference color sampler'
    bm=regions[layer['id']];uv=bm.loops.layers.uv.active;transfers=[]
    for f in bm.faces:
        coord=sum((loop[uv].uv for loop in f.loops),Vector((0,0)))/len(f.loops)
        rgb=colors[int((1-coord.y)*1023)%1024,int(coord.x*1023)%1024]/255
        h,s,v=colorsys.rgb_to_hsv(*rgb)
        if h*360<=rule['hueMaxDeg'] and s>=rule['saturationMin']:continue
        target=rule['fallback']
        p=f.calc_center_median()
        if s<.43 and p.z>height(layer['upper'],p)-.002:target=rule.get('upperFallback',target)
        transfers.append((f,target))
    caches={key:{tuple(round(c,8) for c in v.co):v for v in other.verts} for key,other in regions.items()}
    for f,target in transfers:
        other=regions[target];lookup=caches[target];other_uv=other.loops.layers.uv.active
        verts=[];tex=[]
        for loop in f.loops:
            key=tuple(round(c,8) for c in loop.vert.co)
            if key not in lookup:lookup[key]=other.verts.new(loop.vert.co)
            verts.append(lookup[key]);tex.append(loop[uv].uv.copy())
        if len(set(verts))<3:continue
        try:new=other.faces.new(verts)
        except ValueError:continue
        new[other.faces.layers.int.get('photographed_surface')]=1
        for loop,coord in zip(new.loops,tex):loop[other_uv].uv=coord
    bmesh.ops.delete(bm,geom=[f for f,_ in transfers],context='FACES')
    for mesh in regions.values():
        loose=[v for v in mesh.verts if not v.link_faces]
        if loose:bmesh.ops.delete(mesh,geom=loose,context='VERTS')
    print('Color-guided surface ownership',layer['id'],len(transfers),'faces')

for layer in recipe['layers']:
    bm=regions[layer['id']];scan=bm.faces.layers.int.get('photographed_surface')
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
    bm=separate_pinches(bm);scan=bm.faces.layers.int.get('photographed_surface')
    # Tiny disconnected capture fragments have no reliable photographed volume.
    pending=set(bm.faces);components=[]
    while pending:
        seed=pending.pop();component=[seed];queue=[seed]
        while queue:
            face=queue.pop()
            for edge in face.edges:
                for neighbor in edge.link_faces:
                    if neighbor in pending:pending.remove(neighbor);component.append(neighbor);queue.append(neighbor)
        components.append(component)
    if len(components)>1:
        largest=max(components,key=len)
        scraps=[f for component in components if component is not largest and sum(f.calc_area() for f in component)<recipe.get('minimumComponentArea',0) for f in component]
        if scraps:bmesh.ops.delete(bm,geom=scraps,context='FACES')
        loose=[v for v in bm.verts if not v.link_faces]
        if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
    (out/(layer['id']+'-preclose.json')).write_text(json.dumps({'edgesOverTwo':sum(len(e.link_faces)>2 for e in bm.edges),'boundary':sum(e.is_boundary for e in bm.edges),'pinches':sum(sum(e.is_boundary for e in v.link_edges)>2 for v in bm.verts)}))
    # Seal only the newly exposed interior. Existing photographed faces remain.
    boundary=[e for e in bm.edges if e.is_boundary]
    filled=seal_loops(bm)
    for f in filled:f[scan]=0;f.material_index=1
    bmesh.ops.triangulate(bm,faces=filled,quad_method='BEAUTY',ngon_method='BEAUTY')
    # Interior tessellation is independent of the untouched exterior surface.
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    prototypes=layer.get('pieces') or [{'id':layer['id'],'offset':layer['offset']}]
    for spec in prototypes:
        part=bm.copy();tag=part.faces.layers.int.get('photographed_surface')
        if 'half' in spec:
            bmesh.ops.bisect_plane(part,geom=list(part.verts)+list(part.edges)+list(part.faces),dist=1e-8,plane_co=(recipe.get('splitX',-.002),0,0),plane_no=(1,0,0),clear_inner=spec['half']=='right',clear_outer=spec['half']=='left')
            part=separate_pinches(part);tag=part.faces.layers.int.get('photographed_surface')
            newfaces=seal_loops(part)
            for f in newfaces:f[tag]=0;f.material_index=1
            bmesh.ops.triangulate(part,faces=newfaces)
            # Complete the hidden half of overlapping slices without moving the
            # original rind. Each piece has its own scan-fit center and UVs.
            sign=1 if spec['half']=='left' else -1
            for v in part.verts:
                if any(f[tag] for f in v.link_faces):continue
                distance=abs(v.co.x-recipe.get('splitX',-.002))
                influence=max(0,1-distance/.025)
                arc=max(0,1-((v.co.y-spec['center'][1])/.051)**2)
                v.co.x+=sign*.014*influence*arc
        uv=part.loops.layers.uv.active
        center=spec.get('center',layer.get('textureCenter',[0,0]))
        size=spec.get('textureSize',layer.get('textureSize',[.13,.13]))
        interior=[v for v in part.verts if not any(f[tag] for f in v.link_faces)]
        if layer.get('smoothInterior'):
            for _ in range(layer['smoothInterior']):bmesh.ops.smooth_vert(part,verts=interior,factor=.45,use_axis_x=True,use_axis_y=True,use_axis_z=True)
            part.normal_update()
        for f in part.faces:
            f.smooth=True
            if not f[tag]:
                underside=layer.get('underside') if f.normal.z<-.3 else None
                f.material_index=2 if underside else 1
                for loop in f.loops:
                    p=loop.vert.co;u=(p.x-center[0])/size[0]+.5;v=(p.y-center[1])/size[1]+.5
                    if underside:
                        u=(u-.5)*underside['uvScale'][0]+underside['uvCenter'][0]
                        v=(v-.5)*underside['uvScale'][1]+underside['uvCenter'][1]
                    if layer.get('uvDiskRadius'):
                        dx=u-.5;dy=v-.51;radius=math.hypot(dx,dy)
                        if radius>layer['uvDiskRadius']:
                            ratio=layer['uvDiskRadius']/radius;u=.5+dx*ratio;v=.51+dy*ratio
                    if layer.get('rindUV') and abs(f.normal.z)<.45:
                        u,v=layer['rindUV']
                    loop[uv].uv=(u,v)
        # A subtle relief affects reconstructed interior vertices only.
        for v in part.verts:
            if any(f[tag] for f in v.link_faces):continue
            v.co.z+=layer.get('relief',.00012)*math.sin(v.co.x*1900)*math.sin(v.co.y*1370)
        bmesh.ops.recalc_face_normals(part,faces=list(part.faces))
        mesh=bpy.data.meshes.new(spec['id']+' reference surfaces')
        mesh.materials.append(material(spec['id']+'-reference',source_image,layer.get('roughness',.8)))
        mesh.materials.append(material(spec['id']+'-interior',image(layer['texture']),layer.get('interiorRoughness',.8)))
        if layer.get('underside'):mesh.materials.append(material(spec['id']+'-underside',image(layer['texture']),.84))
        part.to_mesh(mesh);mesh.update()
        obj=bpy.data.objects.new(spec['id'],mesh);bpy.context.scene.collection.objects.link(obj)
        if layer.get('completion'):
            part.free();complete_with_donor(obj,layer,spec)
            part=bmesh.new();part.from_mesh(obj.data);tag=part.faces.layers.int.get('photographed_surface')
            bmesh.ops.recalc_face_normals(part,faces=list(part.faces));part.to_mesh(obj.data)
        obj['ingredient']=layer['id'];obj['assembled_position']=[0,0,0];obj['exploded_position']=spec['offset']
        obj['reference_source']=recipe['source']['object'];objects.append(obj)
        report['parts'][spec['id']]={'vertices':len(part.verts),'faces':len(part.faces),'boundaryEdges':sum(e.is_boundary for e in part.edges),'nonManifoldEdges':sum(not e.is_manifold for e in part.edges),'volume':part.calc_volume(),'scannedFaces':sum(f[tag]!=0 for f in part.faces)}
        exterior_vertices={v for f in part.faces if f[tag] for v in f.verts}
        deviation=max((reference_tree.find_nearest(v.co)[3] for v in exterior_vertices),default=0)
        report['parts'][spec['id']]['exteriorMaxDeviationMeters']=deviation
        assert deviation<1e-6, (spec['id'],'Exterior moved away from reference',deviation)
        assert report['parts'][spec['id']]['nonManifoldEdges']==0 and report['parts'][spec['id']]['volume']>0, (spec['id'],'Not a closed volume',report['parts'][spec['id']])
        part.free()
    bm.free()

# Save an unmodified reference alongside the rebuild for reproducible comparison.
def export(path,selected):
    for o in selected:o.hide_set(False);o.hide_render=False
    bpy.ops.object.select_all(action='DESELECT')
    for o in selected:o.select_set(True)
    bpy.context.view_layer.objects.active=selected[0];bpy.context.view_layer.update()
    window=bpy.context.window_manager.windows[0]
    with bpy.context.temp_override(window=window,active_object=selected[0],object=selected[0],selected_objects=selected,selected_editable_objects=selected):
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_image_format='AUTO')
source.hide_set(False);source.hide_render=False
bpy.ops.object.select_all(action='DESELECT');source.select_set(True)
bpy.context.view_layer.objects.active=source;bpy.context.view_layer.update()
export(out/'reference.glb',[source])
source.hide_set(True);source.hide_render=True
for obj in objects:
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
    bpy.context.view_layer.objects.active=obj;bpy.context.view_layer.update()
    export(out/(obj.name+'.glb'),[obj])
bpy.ops.object.select_all(action='DESELECT')
for obj in objects:obj.select_set(True)
export(out/'assembly.glb',objects)
for obj in objects:
    obj.location=(0,0,0);obj.keyframe_insert(data_path='location',frame=1)
    obj.location=obj['exploded_position'];obj.keyframe_insert(data_path='location',frame=31)
scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=31;scene.frame_set(31)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(root/recipe['blendOutput']))
(out/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
