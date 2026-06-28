#!/usr/bin/env bash
# Install a fully-transparent "Hidden" xcursor theme for the kiosk user.
#
# Why: pi-kiosk.sh exports XCURSOR_THEME=Hidden so cage/wlroots renders an
# invisible cursor. That only works if a theme called "Hidden" actually exists in
# the user's icon path — otherwise the lookup falls back to the default (visible)
# cursor and the boot-time replug (hide-cursor-replug.sh) just reveals the real
# pointer. This theme was originally hand-made and did not survive an SD reimage,
# so it now lives here and is installed by pi-setup.sh on every fresh build.
#
# The theme is a single 1x1 fully-transparent Xcursor image aliased to every
# common cursor name. Run as the kiosk user (no sudo). Idempotent.
set -euo pipefail

THEME_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/icons/Hidden"
CURSORS="$THEME_DIR/cursors"
mkdir -p "$CURSORS"

cat > "$THEME_DIR/index.theme" <<'EOF'
[Icon Theme]
Name=Hidden
Comment=Fully transparent cursor for the Petro kiosk
EOF

# Generate a valid Xcursor file holding one 1x1 fully-transparent ARGB image.
python3 - "$CURSORS/left_ptr" <<'PY'
import struct, sys
path = sys.argv[1]
IMAGE_TYPE = 0xfffd0002
size = 1
# File header: "Xcur", header size (16), version, ntoc (1)
header = b'Xcur' + struct.pack('<III', 16, 0x00010000, 1)
# TOC entry: type, subtype (nominal size), byte offset of the chunk
chunk_offset = 16 + 12
toc = struct.pack('<III', IMAGE_TYPE, size, chunk_offset)
# Image chunk: header(36) type subtype version width height xhot yhot delay + pixels
img = struct.pack('<IIIIIIIII', 36, IMAGE_TYPE, size, 1, 1, 1, 0, 0, 0)
img += struct.pack('<I', 0)  # one fully-transparent ARGB pixel
with open(path, 'wb') as f:
    f.write(header + toc + img)
PY

# Alias every cursor name a compositor might request to the transparent image.
cd "$CURSORS"
for name in default left_ptr right_ptr top_left_arrow pointer hand hand1 hand2 \
  xterm text crosshair watch wait progress help question_arrow \
  fleur move grab grabbing all-scroll \
  sb_h_double_arrow sb_v_double_arrow \
  size_all size_hor size_ver size_fdiag size_bdiag \
  n-resize s-resize e-resize w-resize ne-resize nw-resize se-resize sw-resize \
  col-resize row-resize ew-resize ns-resize nesw-resize nwse-resize \
  not-allowed no-drop copy alias cell context-menu pencil \
  top_left_corner top_right_corner bottom_left_corner bottom_right_corner \
  left_side right_side top_side bottom_side; do
  [ "$name" = left_ptr ] && continue
  ln -sf left_ptr "$name"
done

echo "install-hidden-cursor: transparent 'Hidden' theme installed at $THEME_DIR"
