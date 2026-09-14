"""Render actual saved sources, never silently rebuild them for a preview."""
import os,sys,math
sys.path.insert(0,os.path.dirname(__file__))
import bpy
from mathutils import Vector
import common as C
import preview as P

def light(name,pos,target,power,color,size):
    d=bpy.data.lights.new(name,'AREA'); d.energy=power; d.color=color; d.shape='DISK'; d.size=size
    o=bpy.data.objects.new(name,d); bpy.context.collection.objects.link(o); o.location=pos
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()

def setup():
    s=bpy.context.scene; s.render.engine='CYCLES'; s.cycles.samples=20; s.cycles.use_denoising=True
    s.render.resolution_x=720; s.render.resolution_y=900; s.render.resolution_percentage=100
    s.view_settings.view_transform='Standard'; s.view_settings.look='Medium High Contrast'
    s.world.use_nodes=True
    bg=s.world.node_tree.nodes.get('Background'); bg.inputs[0].default_value=(.04,.052,.085,1); bg.inputs[1].default_value=.65
    light('review_key',(2,-3,3),(0,0,1.2),180,(1,.88,.76),3)
    light('review_fill',(-2,-1,2),(0,0,1.2),100,(.65,.79,1),2.5)
    light('review_rim',(1,2,3),(0,0,1.1),240,(.70,.82,1),2)

def character(variant):
    bpy.ops.wm.open_mainfile(filepath=os.path.join(C.BLEND_DIR,variant+'.blend'))
    setup(); arm=bpy.data.objects.get('rig_'+variant)
    P.reset_pose(arm)
    for label,pos in [('front',(0,-4,1.1)),('34',(2.6,-4,1.5)),('side',(4,0,1.1))]:
        cam=P.make_camera('review_'+label,pos,True,2.15); P.look_at(cam,(0,0,.98))
        P.render_to(cam,os.path.join(C.PREVIEW_DIR,variant+'_polish_'+label+'.png'))
    clip='idle_bat' if variant=='aoi' else 'idle_set'
    P.apply_action(arm,clip,0)
    cam=P.make_camera('review_pose',(2.8,-4,1.4),True,2.15); P.look_at(cam,(0,0,1))
    P.render_to(cam,os.path.join(C.PREVIEW_DIR,variant+'_polish_ready.png'))

def field():
    bpy.ops.wm.open_mainfile(filepath=os.path.join(C.BLEND_DIR,'field.blend'))
    setup(); s=bpy.context.scene; s.render.resolution_x=1280; s.render.resolution_y=720
    light('park_key',(0,-10,45),(0,25,0),24000,(1,.85,.68),55)
    light('park_fill',(-35,45,45),(0,25,0),28000,(.55,.7,1),60)
    for label,pos,target in [('overview',(0,-40,30),(0,32,1)),('plate',(0,-6.7,2.1),(0,32,2))]:
        cam=P.make_camera('review_'+label,pos); P.look_at(cam,target); cam.data.lens=28 if label=='overview' else 35
        P.render_to(cam,os.path.join(C.PREVIEW_DIR,'field_polish_'+label+'.png'))

if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['aoi','reina','field']
    for a in args:
        if a=='field': field()
        else: character(a)
