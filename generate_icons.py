import math
import os
from PIL import Image, ImageDraw

def create_taskguard_icon(size=256):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    scale = size / 256.0

    # Draw rounded background squircle
    margin = int(14 * scale)
    radius = int(46 * scale)
    box = [margin, margin, size - margin, size - margin]
    
    # Background slate color
    draw.rounded_rectangle(box, radius=radius, fill=(15, 23, 42, 255), outline=(51, 65, 85, 255), width=int(5 * scale))
    
    # Inner glowing outline
    inner_box = [margin + int(6 * scale), margin + int(6 * scale), size - margin - int(6 * scale), size - margin - int(6 * scale)]
    draw.rounded_rectangle(inner_box, radius=radius - int(4 * scale), outline=(16, 185, 129, 120), width=int(2 * scale))

    # Shield polygon coordinates (scaled)
    cx = size / 2.0
    shield_pts = [
        (cx, int(48 * scale)),
        (int(194 * scale), int(56 * scale)),
        (int(194 * scale), int(120 * scale)),
        (cx, int(204 * scale)),
        (int(62 * scale), int(120 * scale)),
        (int(62 * scale), int(56 * scale)),
    ]
    # Draw shield body
    draw.polygon(shield_pts, fill=(30, 41, 59, 255), outline=(16, 185, 129, 255))
    
    # Thicker outline for shield
    for i in range(len(shield_pts)):
        p1 = shield_pts[i]
        p2 = shield_pts[(i + 1) % len(shield_pts)]
        draw.line([p1, p2], fill=(16, 185, 129, 255), width=int(7 * scale))

    # Inner shield accent
    inner_shield_pts = [
        (cx, int(60 * scale)),
        (int(182 * scale), int(68 * scale)),
        (int(182 * scale), int(116 * scale)),
        (cx, int(190 * scale)),
        (int(74 * scale), int(116 * scale)),
        (int(74 * scale), int(68 * scale)),
    ]
    draw.polygon(inner_shield_pts, fill=(15, 23, 42, 220))

    # Security checkmark lines
    chk_pt1 = (int(102 * scale), int(126 * scale))
    chk_pt2 = (int(120 * scale), int(144 * scale))
    chk_pt3 = (int(158 * scale), int(104 * scale))
    draw.line([chk_pt1, chk_pt2], fill=(52, 211, 153, 255), width=int(11 * scale))
    draw.line([chk_pt2, chk_pt3], fill=(52, 211, 153, 255), width=int(11 * scale))
    
    # Smooth checkmark joints with circles
    draw.ellipse([chk_pt1[0] - int(5 * scale), chk_pt1[1] - int(5 * scale), chk_pt1[0] + int(5 * scale), chk_pt1[1] + int(5 * scale)], fill=(52, 211, 153, 255))
    draw.ellipse([chk_pt2[0] - int(5 * scale), chk_pt2[1] - int(5 * scale), chk_pt2[0] + int(5 * scale), chk_pt2[1] + int(5 * scale)], fill=(52, 211, 153, 255))
    draw.ellipse([chk_pt3[0] - int(5 * scale), chk_pt3[1] - int(5 * scale), chk_pt3[0] + int(5 * scale), chk_pt3[1] + int(5 * scale)], fill=(52, 211, 153, 255))

    # Corner traffic status dot
    dot_cx = int(194 * scale)
    dot_cy = int(60 * scale)
    r_outer = int(14 * scale)
    r_inner = int(7 * scale)
    draw.ellipse([dot_cx - r_outer, dot_cy - r_outer, dot_cx + r_outer, dot_cy + r_outer], fill=(16, 185, 129, 255), outline=(2, 6, 23, 255), width=int(3 * scale))
    draw.ellipse([dot_cx - r_inner, dot_cy - r_inner, dot_cx + r_inner, dot_cy + r_inner], fill=(110, 231, 183, 255))

    return img

def main():
    base_dir = r"c:\Users\elvis\OneDrive\Desktop\Taskguard-desktop BH"
    tauri_icons_dir = os.path.join(base_dir, "src-tauri", "icons")
    public_dir = os.path.join(base_dir, "public")
    
    os.makedirs(tauri_icons_dir, exist_ok=True)
    os.makedirs(public_dir, exist_ok=True)

    img256 = create_taskguard_icon(256)
    
    # Save standard sizes
    sizes = [16, 32, 48, 64, 128, 256]
    images = []
    for s in sizes:
        img_s = create_taskguard_icon(s)
        images.append(img_s)
        if s == 32:
            img_s.save(os.path.join(tauri_icons_dir, "32x32.png"))
        elif s == 128:
            img_s.save(os.path.join(tauri_icons_dir, "128x128.png"))
        elif s == 256:
            img_s.save(os.path.join(tauri_icons_dir, "128x128@2x.png"))
            img_s.save(os.path.join(tauri_icons_dir, "icon.png"))
            img_s.save(os.path.join(public_dir, "app-icon.png"))

    # Save Windows .ICO file with all resolutions
    ico_path = os.path.join(tauri_icons_dir, "icon.ico")
    public_ico = os.path.join(public_dir, "favicon.ico")
    root_ico = os.path.join(base_dir, "taskguard.ico")
    
    images[0].save(ico_path, format="ICO", sizes=[(s, s) for s in sizes], append_images=images[1:])
    images[0].save(public_ico, format="ICO", sizes=[(s, s) for s in sizes], append_images=images[1:])
    images[0].save(root_ico, format="ICO", sizes=[(s, s) for s in sizes], append_images=images[1:])
    
    print("SUCCESS: Generated all TaskGuard icon assets and .ico files.")

if __name__ == "__main__":
    main()
