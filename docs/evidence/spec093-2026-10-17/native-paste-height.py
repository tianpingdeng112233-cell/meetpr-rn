import subprocess,time,re,xml.etree.ElementTree as ET
ADB='/opt/homebrew/share/android-commandlinetools/platform-tools/adb'
def adb(*args):return subprocess.check_output([ADB,*args],text=True)
def ui():
 adb('shell','uiautomator','dump','/sdcard/spec093-height.xml')
 return ET.fromstring(adb('shell','cat','/sdcard/spec093-height.xml'))
def field():
 return next(n for n in ui().iter('node') if n.get('class')=='android.widget.EditText' and n.get('content-desc')=='邀请码')
def coords(n):return list(map(int,re.findall(r'\d+',n.get('bounds'))))
n=field();x1,y1,x2,y2=coords(n);before=y2-y1;x=(x1+x2)//2;y=(y1+y2)//2
adb('shell','input','tap',str(x),str(y));adb('shell','input','keycombination','113','29');adb('shell','input','keyevent','67');time.sleep(1)
adb('shell','input','keycombination','113','50');time.sleep(1);adb('shell','input','keyevent','4');time.sleep(1)
n=field();x1,y1,x2,y2=coords(n);after=y2-y1
print(f'native paste value={n.get("text")} height_before={before}px height_after={after}px')
assert n.get('text')=='ABCD 234 567'
assert before * 0.8 <= after <= before,'Native paste enlarged the single-line invite field'
