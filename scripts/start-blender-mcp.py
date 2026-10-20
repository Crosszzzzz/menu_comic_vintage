import bpy
import addon_utils

addon_utils.enable('blender_mcp', default_set=False, persistent=True)
import blender_mcp
bpy.context.scene.blendermcp_auto_start_server = True
blender_mcp._blendermcp_ensure_server_running()
print('Blender MCP ready on localhost:9876', flush=True)
