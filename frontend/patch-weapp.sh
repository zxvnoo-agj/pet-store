#!/bin/bash
# Post-build patch for WeChat mini program
# Fixes: missing page shell files, missing template tmpl_0_71, scroll-view padding warning

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST="$SCRIPT_DIR/dist"
BASE_WXML="$DIST/base.wxml"

# 1. Ensure app.json page entries have their generated shell files.
node "$SCRIPT_DIR/scripts/ensure-weapp-pages.cjs"

# 2. Remove padding from scroll-view templates
if [ -f "$BASE_WXML" ]; then
  sed -i 's/ padding="{{xs.b(i\.p11,\[0,0,0,0\])}}"//g' "$BASE_WXML"
fi

# 3. Add tmpl_0_71 template if not present
if [ -f "$BASE_WXML" ] && ! grep -q 'tmpl_0_71' "$BASE_WXML"; then
  # Insert before tmpl_15_container
  sed -i '/<template name="tmpl_15_container">/i\
<template name="tmpl_0_71">\
  <view style="{{i.st}}" class="{{i.cl}}"  id="{{i.uid||i.sid}}" data-sid="{{i.sid}}">\
    <block wx:for="{{i.cn}}" wx:key="sid">\
      <template is="{{xs.a(c, item.nn, l)}}" data="{{i:item,c:c+1,l:xs.f(l,item.nn)}}" />\
    </block>\
  </view>\
</template>\
' "$BASE_WXML"
fi

echo "Patched $BASE_WXML"
