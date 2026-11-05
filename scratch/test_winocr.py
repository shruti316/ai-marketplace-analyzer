import time
from PIL import Image

try:
    import winocr
    print("winocr imported")
    t0 = time.time()
    img = Image.open("data/raw/images/cache/0062279068_img_0.jpg")
    print("Image loaded, size:", img.size)
    res = winocr.recognize_pil_sync(img)
    print("winocr done in", time.time() - t0, "result:", res)
except Exception as e:
    print("Error:", e)
