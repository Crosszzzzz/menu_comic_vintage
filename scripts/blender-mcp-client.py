"""Call the installed Blender MCP server over the MCP stdio protocol."""
import asyncio, json, sys, os
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    params = StdioServerParameters(command='C:/Users/Enrique/.local/bin/uvx.exe', args=['blender-mcp'], env={**os.environ, 'DISABLE_TELEMETRY':'true'})
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write, read_timeout_seconds=600) as session:
            await session.initialize()
            if len(sys.argv) == 1:
                result = await session.list_tools()
                print(json.dumps([t.model_dump() for t in result.tools],indent=2))
            else:
                if sys.argv[1] == '--script':
                    path = Path(sys.argv[2]).resolve()
                    args = {'code': '__file__ = '+repr(str(path))+'\n'+path.read_text(encoding='utf-8-sig'), 'user_prompt':'usa el blender mcp'}
                    if '--recipe' in sys.argv:
                        recipe = Path(sys.argv[sys.argv.index('--recipe')+1]).resolve()
                        args['code'] = 'RECIPE_PATH = '+repr(str(recipe))+'\n'+args['code']
                    tool = 'execute_blender_code'
                else:
                    args = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8')) if len(sys.argv)>2 else {}
                    tool = sys.argv[1]
                result = await session.call_tool(tool,args)
                failed = getattr(result, 'is_error', False)
                for content in result.content:
                    if content.type == 'text':
                        print(content.text)
                        failed = failed or content.text.startswith('Error executing code:')
                if failed: raise RuntimeError('Blender MCP operation failed; see the response above.')

asyncio.run(main())


