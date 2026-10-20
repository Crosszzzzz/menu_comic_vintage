"""Build lightweight tangent-space relief maps from the food's own photographs."""
import bpy, numpy as np
from pathlib import Path
root=Path(__file__).resolve().parents[1]
maps={}
for name in ['top-bun','bottom-bun','egg','tomato','tomato-2']:
    obj=bpy.data.objects[name]
    for mat in obj.data.materials:
        nt=mat.node_tree
        bsdf=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED')
        color=next(n.image for n in nt.nodes if n.type=='TEX_IMAGE' and n.image)
        crumb='crumb' in mat.name
        # Small-scale highlights distinguish moist flesh from porous bread.
        bsdf.inputs['Roughness'].default_value=.9 if crumb else .79 if 'bun' in name else .48 if name=='egg' else .36
        bsdf.inputs['Specular IOR Level'].default_value=.22 if 'bun' in name else .32
        if color.name not in maps:
            source=color.copy(); source.scale(512,512)
            pixels=np.empty(512*512*4,dtype=np.float32); source.pixels.foreach_get(pixels)
            rgb=pixels.reshape(512,512,4)[:,:,:3]
            h=rgb@np.array([.2126,.7152,.0722],dtype=np.float32)
            # Suppress photographic illumination; retain only local texture gradients.
            for _ in range(2): h=(h*4+np.roll(h,1,0)+np.roll(h,-1,0)+np.roll(h,1,1)+np.roll(h,-1,1))/8
            dy,dx=np.gradient(h)
            strength=6 if crumb else 2.8 if 'bun' in name else 2
            normal=np.stack((-dx*strength,-dy*strength,np.ones_like(h)),axis=-1)
            normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
            rgba=np.ones((512,512,4),dtype=np.float32); rgba[:,:,:3]=normal*.5+.5
            image=bpy.data.images.new(color.name+' relief',width=512,height=512)
            image.colorspace_settings.name='Non-Color'; image.pixels.foreach_set(rgba.ravel())
            image.filepath_raw=str(root/'artifacts/blender'/(('crumb' if crumb else name)+'-normal.png'))
            image.file_format='PNG'; image.save(); image.pack(); maps[color.name]=image
            bpy.data.images.remove(source)
        for n in list(nt.nodes):
            if n.type=='NORMAL_MAP': nt.nodes.remove(n)
        normal_tex=nt.nodes.new('ShaderNodeTexImage'); normal_tex.image=maps[color.name]; normal_tex.label='Photographic microrelief'
        normal=nt.nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value=.65 if crumb else .4
        nt.links.new(normal_tex.outputs['Color'],normal.inputs['Color']); nt.links.new(normal.outputs['Normal'],bsdf.inputs['Normal'])
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(root/'artifacts/blender/menu-ingredientes-cerrados.blend'))
print('Created',len(maps),'512px relief maps; calibrated bread, egg and tomato roughness.')
