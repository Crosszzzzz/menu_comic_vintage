import bpy, bmesh, math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
food_names={'burger','top-bun','bottom-bun','egg','tomato'}
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH' and obj.name not in food_names or obj.name.startswith('Tomato bake'):
        bpy.data.objects.remove(obj,do_unlink=True)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for obj in meshes:
    if obj.name=='tomato': continue
    orientation=sum(f.normal.z*f.area for f in obj.data.polygons)
    print(obj.name,'surface orientation',orientation)
    if orientation<0:
        bm=bmesh.new(); bm.from_mesh(obj.data)
        bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
        bm.to_mesh(obj.data); bm.free(); obj.data.update()

# Bake the scanned tomato face in orthographic projection. Interpolating the old
# scan's fragmented UV islands on a rebuilt surface causes bright seam artifacts.
for obj in meshes: obj.hide_render=True
bpy.ops.wm.obj_import(filepath=str(root/'artifacts/blender/source/Tomate/Tomate.obj'))
raw=bpy.context.selected_objects[0]; raw.hide_render=False
bpy.context.view_layer.objects.active=raw
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
poly_px=[(240,162),(247,123),(265,92),(295,65),(328,53),(370,49),(405,55),(436,77),(461,101),(480,132),(487,163),(485,203),(471,238),(448,259),(416,274),(378,281),(340,276),(300,262),(270,239),(249,208),(240,181)]
size=.413715988*1.15
poly=[Vector(((x-320)*size/640,(320-y)*size/640)) for x,y in poly_px]
center=sum(poly,Vector((0,0)))/len(poly)
boundary=[]
for i in range(160):
    direction=Vector((math.cos(2*math.pi*i/160),math.sin(2*math.pi*i/160)))
    distances=[]
    for a,b in zip(poly,poly[1:]+poly[:1]):
        delta=b-a; cross=direction.x*delta.y-direction.y*delta.x
        if abs(cross)<1e-9: continue
        diff=a-center; t=(diff.x*delta.y-diff.y*delta.x)/cross; u=(diff.x*direction.y-diff.y*direction.x)/cross
        if t>0 and 0<=u<=1: distances.append(t)
    boundary.append(center+direction*min(distances)*.975)
lo=Vector((min(p.x for p in boundary),min(p.y for p in boundary)))
hi=Vector((max(p.x for p in boundary),max(p.y for p in boundary)))
mid=(lo+hi)/2
tree=raw.data.materials[0].node_tree
tex=next(n for n in tree.nodes if n.type=='TEX_IMAGE' and 'diffuse' in n.image.name)
out=next(n for n in tree.nodes if n.type=='OUTPUT_MATERIAL')
emit=tree.nodes.new('ShaderNodeEmission'); tree.links.new(tex.outputs['Color'],emit.inputs['Color']); tree.links.new(emit.outputs[0],out.inputs['Surface'])
scene=bpy.context.scene
data=bpy.data.cameras.new('Tomato bake'); camera=bpy.data.objects.new('Tomato bake',data); scene.collection.objects.link(camera)
camera.location=(mid.x,mid.y,1); camera.rotation_euler=(0,0,0); data.type='ORTHO'; data.ortho_scale=hi.x-lo.x
scene.camera=camera; scene.render.engine='CYCLES'; scene.cycles.samples=8
scene.render.resolution_x=1024; scene.render.resolution_y=1024; scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard'; scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(root/'artifacts/blender/tomato-baked.png')
bpy.ops.render.render(write_still=True)
tomato=bpy.data.objects['tomato']
image=bpy.data.images.load(scene.render.filepath,check_existing=False)
material=bpy.data.materials.new('Tomato scanned color'); material.use_nodes=True; material.use_backface_culling=True
bsdf=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'); bsdf.inputs['Roughness'].default_value=.85
texture=material.node_tree.nodes.new('ShaderNodeTexImage'); texture.image=image
material.node_tree.links.new(texture.outputs['Color'],bsdf.inputs['Base Color'])
tomato.data.materials.clear(); tomato.data.materials.append(material)
layer=tomato.data.uv_layers.active
for loop in tomato.data.loops:
    v=tomato.data.vertices[loop.vertex_index].co
    layer.data[loop.index].uv=(v.x/.083+.5,v.y/.083+.5)
bpy.data.objects.remove(raw,do_unlink=True); bpy.data.objects.remove(camera,do_unlink=True)
for obj in meshes: obj.hide_render=obj.name=='burger'
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(root/'artifacts/blender/menu-ingredientes.blend'))
print('Corrected outward normals and baked seamless tomato texture')
