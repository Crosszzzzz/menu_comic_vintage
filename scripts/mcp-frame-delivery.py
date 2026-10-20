import bpy
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
bpy.context.scene.frame_set(31)
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
    if obj.type=='MESH':
        obj.hide_set(obj.name=='burger')
        obj.hide_render=obj.name=='burger'
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active
            space.clip_start=.001
            space.shading.type='MATERIAL'
            space.overlay.show_floor=False
            space.region_3d.view_location=Vector((0,0,.09))
            space.region_3d.view_distance=.48
            space.region_3d.view_rotation=Vector((-.20,.45,-.25)).to_track_quat('-Z','Y')
bpy.ops.wm.save_as_mainfile(filepath=str(root/'artifacts/blender/menu-ingredientes.blend'))
print('Editable Blender scene ready, frame 31: exploded ingredients.')
