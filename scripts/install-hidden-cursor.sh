#!/usr/bin/env bash
# Install a fully-transparent xcursor theme for the kiosk user, as BOTH a
# named "Hidden" theme and an override of the system "default" theme.
#
# Why: this cage build (0.2.0-2+rpt1) never reads XCURSOR_THEME/XCURSOR_SIZE —
# checked the compiled binary and libwlroots.so directly, neither string
# appears anywhere. So XCURSOR_THEME=Hidden (set in pi-kiosk.sh) is a no-op;
# cage always falls back to whatever theme resolves as "default"
# (/usr/share/icons/default, which normally inherits Adwaita's visible arrow).
# The only thing that actually hides the cursor is overriding that "default"
# theme in the user's own icon path (~/.icons takes precedence over
# /usr/share/icons), with a self-contained theme — no Inherits= indirection,
# since cage's trimmed xcursor loader may not support theme inheritance.
#
# The "Hidden" copy is kept too (harmless) in case something still references
# XCURSOR_THEME=Hidden by name. This theme was originally hand-made and did
# not survive an SD reimage, so it now lives here and is installed by
# pi-setup.sh on every fresh build.
#
# The theme is a single 1x1 fully-transparent Xcursor image aliased to every
# common cursor name. Run as the kiosk user (no sudo). Idempotent.
set -euo pipefail

build_theme() {
  local THEME_DIR="$1" THEME_NAME="$2"
  local CURSORS="$THEME_DIR/cursors"
  mkdir -p "$CURSORS"

  cat > "$THEME_DIR/index.theme" <<EOF
[Icon Theme]
Name=$THEME_NAME
Comment=Fully transparent cursor for the Petro kiosk
EOF

  generate_cursor "$CURSORS/left_ptr"
  alias_cursors "$CURSORS"
}

alias_cursors() {
  cd "$1"
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
  cd - >/dev/null
}

generate_cursor() {
# Generate a valid Xcursor file holding one 1x1 fully-transparent ARGB image.
python3 - "$1" <<'PY'
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
}

build_theme "${XDG_DATA_HOME:-$HOME/.local/share}/icons/Hidden" Hidden
echo "install-hidden-cursor: transparent 'Hidden' theme installed"

# This is the one cage actually uses: it never reads XCURSOR_THEME, only ever
# falls back to whatever resolves as the "default" theme. ~/.icons takes
# precedence over /usr/share/icons, so this override wins without touching
# system files.
build_theme "$HOME/.icons/default" default
echo "install-hidden-cursor: transparent 'default' theme installed at $HOME/.icons/default (this is the one cage actually uses)"
