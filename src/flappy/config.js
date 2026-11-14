// Aaron's single player-art path, shared by the game and the distant visitor.
// 84x28 PNG: three 28x28 frames in one row, up / level / down.
// Registered body pivot (16,14.5); play up, level, down, level. See adjacent
// assets/flappy/cat-bird.frames.json and tools/sprites/prepare-cat-bird.py.
export const PLAYER = {
  src:'assets/flappy/cat-bird.png',frameWidth:28,frameHeight:28,columns:3,
  order:[0,1,2,1],pivot:[16,14.5],
  body:{x:5,y:7,width:22,height:15},fitBodyTo:[34,24],
};
export const PLAYER_SCALE=Math.min(PLAYER.fitBodyTo[0]/PLAYER.body.width,PLAYER.fitBodyTo[1]/PLAYER.body.height);
export const CLONE_IMAGES='vendor/floppybird/assets/';
// Classic portrait coordinates stay fixed through desktop/phone resize.
export const PLAYFIELD={width:288,height:512,floor:400};
// A short landscape screen (a phone on its side, playtest-2) fits the field down to 40 px of ground under the floor
// instead of all 112: the lane is 15% bigger and the cropped ground is only ground. Everything else fits it whole.
export const SHORT_FIELD_HEIGHT=PLAYFIELD.floor+40;
export function flightLayout(width,height){
  const short=width>height&&height<PLAYFIELD.height*1.2,fit=short?SHORT_FIELD_HEIGHT:PLAYFIELD.height;
  const scale=Math.min(width/PLAYFIELD.width,height/fit);
  return {scale,x:(width-PLAYFIELD.width*scale)/2,y:(height-fit*scale)/2,short,
    width:PLAYFIELD.width*scale,height:PLAYFIELD.height*scale,viewportWidth:width,viewportHeight:height};
}
