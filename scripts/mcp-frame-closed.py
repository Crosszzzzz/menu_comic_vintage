import bpy
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
bpy.context.scene.frame_set(31)
bpy.ops.object.select_all(action='DESELECT')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active
            space.clip_start=.001
            space.shading.type='MATERIAL'
            space.overlay.show_floor=False
            space.region_3d.view_location=Vector((0,0,.113))
            space.region_3d.view_distance=.58
            space.region_3d.view_rotation=Vector((-.20,.45,-.25)).to_track_quat('-Z','Y')
bpy.ops.wm.save_as_mainfile(filepath=str(root/'artifacts/blender/menu-ingredientes-cerrados.blend'))
print('Closed ingredient scene ready for review.')
