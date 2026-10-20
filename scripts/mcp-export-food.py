import bpy, json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
out=root/'artifacts/blender/export'; out.mkdir(exist_ok=True)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name in {'burger','top-bun','bottom-bun','egg','tomato'}]
for obj in meshes:
    obj.hide_set(False); obj.hide_render=False
    obj.animation_data_clear(); obj.location=(0,0,0)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.export_scene.gltf(filepath=str(out/(obj.name+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_image_format='JPEG',export_jpeg_quality=90)
stack={'bottom-bun':0,'egg':.013,'tomato':.029,'top-bun':.036}
spread={'bottom-bun':0,'egg':.055,'tomato':.105,'top-bun':.150}
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    obj.hide_render=obj.name=='burger'
    obj.hide_set(obj.name=='burger')
    if obj.name in spread:
        obj.location.z=spread[obj.name]; obj.select_set(True)
        obj['assembled_height']=stack[obj.name]
        obj['exploded_height']=spread[obj.name]
bpy.ops.export_scene.gltf(filepath=str(out/'exploded.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_image_format='JPEG',export_jpeg_quality=90)
# Keep the editable scene open on the assembled ingredients, with a native animation.
for obj in meshes:
    if obj.name in spread:
        obj.location.z=stack[obj.name]; obj.keyframe_insert(data_path='location',frame=1)
        obj.location.z=spread[obj.name]; obj.keyframe_insert(data_path='location',frame=31)
bpy.context.scene.frame_start=1; bpy.context.scene.frame_end=31
bpy.context.scene.render.fps=30; bpy.context.scene.frame_set(31)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(root/'artifacts/blender/menu-ingredientes.blend'))
print('Exported five food models and exploded assembly; packed editable Blender project saved.')
