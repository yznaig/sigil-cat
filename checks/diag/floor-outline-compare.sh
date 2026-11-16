#!/usr/bin/env bash
# Floor lane: labelled before/after images from checks/diag/floor-outline-shot.js's PNGs.
#   checks/diag/floor-outline-compare.sh <shots dir> <size suffix> <out dir> <band top> <band bottom> <dpr>
# compare-<size>.jpg: before | after side by side; floor-row-<size>.jpg: the floor rows, before over after.
set -euo pipefail
d=$1; s=$2; out=$3; top=$4; bottom=$5; dpr=$6
font=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
declare -A L=([before]='before (main)' [after]='after   ink outline on the seven')
mkdir -p "$out"
for n in before after; do cp "$d/$n-$s.png" "$out/$n-$s.png"; done
h=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$d/before-$s.png")
w=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$d/before-$s.png")
bar=$(( h / 18 )); fs=$(( bar * 6 / 10 )); f=''
for k in 0 1; do n=(before after); n=${n[$k]}
  f+="[$k]pad=iw:ih+$bar:0:0:0x1d1a17,drawtext=fontfile=$font:text='${L[$n]}':fontcolor=white:fontsize=$fs:x=(w-tw)/2:y=h-$bar+($bar-th)/2[p$k];"
done
ffmpeg -v error -y -i "$d/before-$s.png" -i "$d/after-$s.png" -filter_complex "${f}[p0][p1]hstack" -q:v 3 "$out/compare-$s.jpg"
cy=$(awk "BEGIN{print int($top*$dpr)}"); ch=$(awk "BEGIN{print int(($bottom-$top)*$dpr)}"); [ $((cy+ch)) -gt $h ] && ch=$((h-cy))
rbar=$(( ch / 7 )); [ $rbar -lt 28 ] && rbar=28; rfs=$(( rbar * 6 / 10 )); f=''
for k in 0 1; do n=(before after); n=${n[$k]}
  f+="[$k]crop=$w:$ch:0:$cy,pad=iw:ih+$rbar:0:$rbar:0x1d1a17,drawtext=fontfile=$font:text='${L[$n]}':fontcolor=white:fontsize=$rfs:x=16:y=($rbar-th)/2[r$k];"
done
ffmpeg -v error -y -i "$d/before-$s.png" -i "$d/after-$s.png" -filter_complex "${f}[r0][r1]vstack=inputs=2" -q:v 3 "$out/floor-row-$s.jpg"
echo "$out/compare-$s.jpg $out/floor-row-$s.jpg"
