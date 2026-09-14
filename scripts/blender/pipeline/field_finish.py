"""Modular park finish; static batches preserve landmarks and lantern sockets."""
import math
import bpy
import common as C

def finish(infield,struct,grass,dirt,metal,glow):
    # Grass inside the basepaths leaves a continuous dirt running lane.
    C.new_mesh_from_pydata('infield_grass',[C.g2b(p) for p in [(0,.022,-4),(15.4,.022,-19.4),(0,.022,-34.8),(-15.4,.022,-19.4)]],[(0,1,2,3)],material=grass,coll=infield)
    for label,x,z,r in [('home',0,0,3.1),('first',19.4,-19.4,2),('second',0,-38.79,2),('third',-19.4,-19.4,2)]:
        C.new_cylinder('dirt_cutout_'+label,r,.008,location=C.g2b((x,.013,z)),verts=40,material=dirt,coll=infield)
    wall=C.flat_material('park_teal',(.035,.12,.14,1))
    seat=C.flat_material('park_seating',(.10,.22,.28,1))
    stone=C.flat_material('park_concrete',(.19,.22,.29,1))
    skyline=C.flat_material('skyline',(.035,.045,.08,1))
    crowd=[C.flat_material('crowd_'+str(i),c) for i,c in enumerate([(.35,.25,.28,1),(.18,.31,.43,1),(.54,.44,.29,1)])]
    batches={}
    def box(name,size,pt,mat):
        o=C.new_box(name,size=size,location=C.g2b(pt),material=mat,coll=struct)
        batches.setdefault(mat.name,[]).append(o)
        return o
    for row in range(7):
        r=25+row*1.25; h=.55+row*.46
        for i in range(56):
            a=math.radians(112+i*136/55); x=r*math.sin(a); z=-r*math.cos(a)
            o=box('terrace',(.92,1.1,.15),(x,h,z),stone); o.rotation_euler.z=a
            if i%8 in (0,1): continue
            o=box('stadium_seat',(.63,.48,.11),(x,h+.24,z),seat); o.rotation_euler.z=a
            o=box('seat_back',(.63,.10,.44),(x+math.sin(a)*.3,h+.47,z-math.cos(a)*.3),seat); o.rotation_euler.z=a
            if (i*7+row*3)%5<3:
                box('crowd_silhouette',(.34,.23,.49),(x,h+.54,z),crowd[(i+row)%3])
    box('scoreboard_frame',(17,.6,7),(0,8,-103),metal)
    box('scoreboard_face',(16.4,.1,6.4),(0,8,-102.65),wall)
    for x in [-6,6]: box('scoreboard_post',(.45,.45,5),(x,2.5,-103),metal)
    def lettering(name,value,pt,size,mat):
        curve=bpy.data.curves.new(name,'FONT'); curve.body=value; curve.align_x='CENTER'; curve.size=size
        o=bpy.data.objects.new(name,curve); struct.objects.link(o); o.location=C.g2b(pt); o.rotation_euler.x=math.pi/2
        o.data.materials.append(mat)
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o; bpy.ops.object.convert(target='MESH')
        batches.setdefault(mat.name,[]).append(o)
    lettering('park_name','LANTERN FIELD',(0,9.5,-102.56),1.0,glow)
    lettering('score_labels','1  2  3     R  H  E',(0,7.8,-102.55),.7,glow)
    lettering('score_home','HOME     0  0  0',(0,6.6,-102.55),.62,glow)
    for i in range(19):
        x=(i-9)*10; z=-120-((i*13)%5)*4; h=7+(i*7)%19
        box('city_building',(6+(i%3),5,h),(x,h/2,z),skyline)
        for floor in range(2,int(h)-1,3):
            for col in [-1.7,1.7]:
                if (i+floor+int(col))%3:
                    box('city_window',(.6,.03,.8),(x+col,floor,z+2.52),glow)
    # One object per material for added seating/crowd/city; no per-seat draw calls.
    for name,objects in batches.items(): C.join_objects(objects,'park_batch_'+name)
