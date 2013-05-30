/// <reference path="../Game.ts" />
/// <reference path="../gameobjects/Sprite.ts" />
/// <reference path="../gameobjects/ScrollZone.ts" />
/// <reference path="../cameras/Camera.ts" />
/// <reference path="IRenderer.ts" />

module Phaser {

    export class CanvasRenderer implements Phaser.IRenderer {

        constructor(game: Phaser.Game) {
            this._game = game;
        }

        /**
         * The essential reference to the main game object
         */
        private _game: Phaser.Game;

        //  local rendering related temp vars to help avoid gc spikes with var creation
        private _ga: number = 1;
        private _sx: number = 0;
        private _sy: number = 0;
        private _sw: number = 0;
        private _sh: number = 0;
        private _dx: number = 0;
        private _dy: number = 0;
        private _dw: number = 0;
        private _dh: number = 0;
        private _fx: number = 1;
        private _fy: number = 1;
        private _sin: number = 0;
        private _cos: number = 1;

        private _cameraList;
        private _camera: Camera;
        private _groupLength: number;

        public render() {

            //  Get a list of all the active cameras

            this._cameraList = this._game.world.getAllCameras();

            //  Then iterate through world.group on them all (where not blacklisted, etc)
            for (var c = 0; c < this._cameraList.length; c++)
            {
                this._camera = this._cameraList[c];

                this._camera.preRender();

                this._game.world.group.render(this, this._camera);

                this._camera.postRender();
            }

            //  Physics Debug layer
            this._game.world.physics.render();

        }

        /**
         * Render this sprite to specific camera. Called by game loop after update().
         * @param camera {Camera} Camera this sprite will be rendered to.
         * @return {boolean} Return false if not rendered, otherwise return true.
         */
        public renderSprite(camera: Camera, sprite: Sprite): bool {

            //  Render checks (needs inCamera check added)
            if (sprite.scale.x == 0 || sprite.scale.y == 0 || sprite.texture.alpha < 0.1)
            {
                return false;
            }

            //  Reset our temp vars
            this._ga = -1;
            this._sx = 0;
            this._sy = 0;
            this._sw = sprite.frameBounds.width;
            this._sh = sprite.frameBounds.height;
            this._fx = sprite.scale.x;
            this._fy = sprite.scale.y;
            this._sin = 0;
            this._cos = 1;
            this._dx = (camera.scaledX * sprite.scrollFactor.x) + sprite.frameBounds.x - (camera.worldView.x * sprite.scrollFactor.x);
            this._dy = (camera.scaledY * sprite.scrollFactor.y) + sprite.frameBounds.y - (camera.worldView.y * sprite.scrollFactor.y);
            this._dw = sprite.frameBounds.width;
            this._dh = sprite.frameBounds.height;

            //  Alpha
            if (sprite.texture.alpha !== 1)
            {
                this._ga = sprite.texture.context.globalAlpha;
                sprite.texture.context.globalAlpha = sprite.texture.alpha;
            }

            //  Sprite Flip X
            if (sprite.texture.flippedX)
            {
                this._fx = -sprite.scale.x;
            }

            //  Sprite Flip Y
            if (sprite.texture.flippedY)
            {
                this._fy = -sprite.scale.y;
            }

            if (sprite.animations.currentFrame !== null)
            {
                this._sx = sprite.animations.currentFrame.x;
                this._sy = sprite.animations.currentFrame.y;

                if (sprite.animations.currentFrame.trimmed)
                {
                    this._dx += sprite.animations.currentFrame.spriteSourceSizeX;
                    this._dy += sprite.animations.currentFrame.spriteSourceSizeY;
                }
            }

            //	Rotation and Flipped
            if (sprite.modified)
            {
                if (sprite.texture.renderRotation == true && (sprite.rotation !== 0 || sprite.rotationOffset !== 0))
                {
                    this._sin = Math.sin(sprite.game.math.degreesToRadians(sprite.rotationOffset + sprite.rotation));
                    this._cos = Math.cos(sprite.game.math.degreesToRadians(sprite.rotationOffset + sprite.rotation));
                }

                //  setTransform(a, b, c, d, e, f);
                //  a = scale x
                //  b = skew x
                //  c = skew y
                //  d = scale y
                //  e = translate x
                //  f = translate y

                sprite.texture.context.save();
                sprite.texture.context.setTransform(this._cos * this._fx, (this._sin * this._fx) + sprite.skew.x, -(this._sin * this._fy) + sprite.skew.y, this._cos * this._fy, this._dx, this._dy);

                this._dx = -sprite.origin.x;
                this._dy = -sprite.origin.y;
            }
            else
            {
                if (!sprite.origin.equals(0))
                {
                    this._dx -= sprite.origin.x;
                    this._dy -= sprite.origin.y;
                }
            }

            this._sx = Math.round(this._sx);
            this._sy = Math.round(this._sy);
            this._sw = Math.round(this._sw);
            this._sh = Math.round(this._sh);
            this._dx = Math.round(this._dx);
            this._dy = Math.round(this._dy);
            this._dw = Math.round(this._dw);
            this._dh = Math.round(this._dh);

            if (sprite.texture.loaded)
            {
                sprite.texture.context.drawImage(
                    sprite.texture.texture,	    //	Source Image
                    this._sx, 			//	Source X (location within the source image)
                    this._sy, 			//	Source Y
                    this._sw, 			//	Source Width
                    this._sh, 			//	Source Height
                    this._dx, 			//	Destination X (where on the canvas it'll be drawn)
                    this._dy, 			//	Destination Y
                    this._dw, 			//	Destination Width (always same as Source Width unless scaled)
                    this._dh			//	Destination Height (always same as Source Height unless scaled)
                );
            }
            else
            {
                //sprite.texture.context.fillStyle = this.fillColor;
                sprite.texture.context.fillStyle = 'rgb(255,255,255)';
                sprite.texture.context.fillRect(this._dx, this._dy, this._dw, this._dh);
            }

            if (sprite.modified)
            {
                sprite.texture.context.restore();
            }

            //if (this.renderDebug)
            //{
            //    this.renderBounds(camera, cameraOffsetX, cameraOffsetY);
                //this.collisionMask.render(camera, cameraOffsetX, cameraOffsetY);
            //}

            if (this._ga > -1)
            {
                sprite.texture.context.globalAlpha = this._ga;
            }

            return true;

        }

        public renderScrollZone(camera: Camera, scrollZone: ScrollZone): bool {

            //  Render checks (needs inCamera check added)
            if (scrollZone.scale.x == 0 || scrollZone.scale.y == 0 || scrollZone.texture.alpha < 0.1)
            {
                return false;
            }

            //  Reset our temp vars
            this._ga = -1;
            this._sx = 0;
            this._sy = 0;
            this._sw = scrollZone.frameBounds.width;
            this._sh = scrollZone.frameBounds.height;
            this._fx = scrollZone.scale.x;
            this._fy = scrollZone.scale.y;
            this._sin = 0;
            this._cos = 1;
            this._dx = (camera.scaledX * scrollZone.scrollFactor.x) + scrollZone.frameBounds.x - (camera.worldView.x * scrollZone.scrollFactor.x);
            this._dy = (camera.scaledY * scrollZone.scrollFactor.y) + scrollZone.frameBounds.y - (camera.worldView.y * scrollZone.scrollFactor.y);
            this._dw = scrollZone.frameBounds.width;
            this._dh = scrollZone.frameBounds.height;

            //  Alpha
            if (scrollZone.texture.alpha !== 1)
            {
                this._ga = scrollZone.texture.context.globalAlpha;
                scrollZone.texture.context.globalAlpha = scrollZone.texture.alpha;
            }

            //  Sprite Flip X
            if (scrollZone.texture.flippedX)
            {
                this._fx = -scrollZone.scale.x;
            }

            //  Sprite Flip Y
            if (scrollZone.texture.flippedY)
            {
                this._fy = -scrollZone.scale.y;
            }

            //	Rotation and Flipped
            if (scrollZone.modified)
            {
                if (scrollZone.texture.renderRotation == true && (scrollZone.rotation !== 0 || scrollZone.rotationOffset !== 0))
                {
                    this._sin = Math.sin(scrollZone.game.math.degreesToRadians(scrollZone.rotationOffset + scrollZone.rotation));
                    this._cos = Math.cos(scrollZone.game.math.degreesToRadians(scrollZone.rotationOffset + scrollZone.rotation));
                }

                //  setTransform(a, b, c, d, e, f);
                //  a = scale x
                //  b = skew x
                //  c = skew y
                //  d = scale y
                //  e = translate x
                //  f = translate y

                scrollZone.texture.context.save();
                scrollZone.texture.context.setTransform(this._cos * this._fx, (this._sin * this._fx) + scrollZone.skew.x, -(this._sin * this._fy) + scrollZone.skew.y, this._cos * this._fy, this._dx, this._dy);

                this._dx = -scrollZone.origin.x;
                this._dy = -scrollZone.origin.y;
            }
            else
            {
                if (!scrollZone.origin.equals(0))
                {
                    this._dx -= scrollZone.origin.x;
                    this._dy -= scrollZone.origin.y;
                }
            }

            this._sx = Math.round(this._sx);
            this._sy = Math.round(this._sy);
            this._sw = Math.round(this._sw);
            this._sh = Math.round(this._sh);
            this._dx = Math.round(this._dx);
            this._dy = Math.round(this._dy);
            this._dw = Math.round(this._dw);
            this._dh = Math.round(this._dh);

            for (var i = 0; i < scrollZone.regions.length; i++)
            {
                if (scrollZone.texture.isDynamic)
                {
                    scrollZone.regions[i].render(scrollZone.texture.context, scrollZone.texture.texture, this._dx, this._dy, this._dw, this._dh);
                }
                else
                {
                    scrollZone.regions[i].render(scrollZone.texture.context, scrollZone.texture.texture, this._dx, this._dy, this._dw, this._dh);
                }
            }

            if (scrollZone.modified)
            {
                scrollZone.texture.context.restore();
            }

            //if (this.renderDebug)
            //{
            //    this.renderBounds(camera, cameraOffsetX, cameraOffsetY);
                //this.collisionMask.render(camera, cameraOffsetX, cameraOffsetY);
            //}

            if (this._ga > -1)
            {
                scrollZone.texture.context.globalAlpha = this._ga;
            }

            return true;

        }

    }

}