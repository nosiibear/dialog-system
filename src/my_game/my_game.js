"use strict";  // Operate in Strict mode such that variables must be declared before used!

import GameObject from "../engine/game_objects/game_object.js";
import engine from "../engine/index.js";

// user stuff
import Brain from "./objects/brain.js";
import Hero from "./objects/hero.js";
import Enemy from "./objects/enemy.js";
import WalkingEnemy from "./objects/walking_enemy.js";

class MyGame extends engine.Scene {
    constructor() {
        super();
        // The camera to view the scene
        this.mCamera = null;

        // For echo message
        this.mMsg = null;

        // the hero and the support objects
        this.mHero = null;

        // mode of running: 
        //   H: Player drive brain
        //   J: Dye drive brain, immediate orientation change
        //   K: Dye drive brain, gradual orientation change
        this.dialogFile = "assets/dialog3.json";
        this.dialogFileGreen = "assets/dialoggreen.json";
        this.dialogFileGreen2 = "assets/dialoggreen2.json";
        this.mTextScrollBeep = "assets/sounds/beep.wav";
        this.mNextArrow = "assets/nextbutton.png";
        this.kHeroSprite = "assets/stupidtownhero.png";

        this.mCurrentDialog = null;
        this.touchedEvil = false;
        this.vanquished = false;

        // textbox style
        this.textbox = null;
        this.textBoxStyleTexture = "assets/TextboxStyle1.png"
    }

    load() {
        engine.texture.load(this.kHeroSprite);
        engine.json.load(this.dialogFile);    
        engine.json.load(this.dialogFileGreen);
        engine.json.load(this.dialogFileGreen2);
        engine.texture.load(this.mNextArrow);
        engine.audio.load(this.mTextScrollBeep);

        engine.texture.load(this.textBoxStyleTexture);
    }

    unload() {
        engine.texture.unload(this.kHeroSprite);
        engine.texture.unload(this.mNextArrow);
        engine.json.unload(this.dialogFile);    
        engine.json.unload(this.dialogFileGreen);
        engine.json.unload(this.dialogFileGreen2);
        engine.audio.unload(this.mTextScrollBeep);
        engine.texture.unload(this.textBoxStyleTexture);

        let jsons = [engine.json.get(this.dialogFile),
            engine.json.get(this.dialogFileGreen),
            engine.json.get(this.dialogFileGreen2)];
        
        for(let i = 0; i < jsons.length; i++) {
            let lines = jsons[i]["DialogLine"]
            for(let j = 0; j < lines.length; j++) {
                engine.texture.unload(lines[i]["SpritePath"]);
                engine.font.unload(lines[j]["NameFont"]);
                engine.font.unload(lines[j]["ContentFont"]);
                engine.audio.unload(lines[j]["ScrollAudio"]);
                engine.audio.unload(lines[j]["LineAudio"]);
            }
        }
    }

    init() {
        // Automated loading
        let jsons = [engine.json.get(this.dialogFile),
            engine.json.get(this.dialogFileGreen),
            engine.json.get(this.dialogFileGreen2)];
        
        for(let i = 0; i < jsons.length; i++) {
            let lines = jsons[i]["DialogLine"]
            for(let j = 0; j < lines.length; j++) {
                engine.texture.load(lines[i]["SpritePath"]);
                engine.font.load(lines[j]["NameFont"]);
                engine.font.load(lines[j]["ContentFont"]);
                engine.audio.load(lines[j]["ScrollAudio"]);
                engine.audio.load(lines[j]["LineAudio"]);
            }
        }

        // Step A: set up the cameras
        this.mCamera = new engine.Camera(
            vec2.fromValues(50, 37.5),   // position of the camera
            100,                       // width of camera
            [0, 0, 640, 480]           // viewport (orgX, orgY, width, height)
        );
        this.mCamera.setBackgroundColor([0.8, 0.8, 0.8, 1]);
        // sets the background to gray

        // Create the brain  
        this.mEnemy = new WalkingEnemy(this.kHeroSprite);
        this.mEnemy2 = new Enemy(this.kHeroSprite);

        //  Create the hero object 
        this.mHero = new Hero(this.kHeroSprite);

        // For echoing
        this.mMsg = new engine.FontRenderable("Status Message");
        this.mMsg.setColor([0, 0, 0, 1]);
        this.mMsg.getXform().setPosition(1, 2);
        this.mMsg.setTextHeight(3);

        this.mRenderSet = new engine.GameObjectSet();

        // create textbox with define style
        this.textbox = new engine.TextureRenderable(this.textBoxStyleTexture);
        this.textbox.setColor([0, 0, 0, 0]);
        this.textbox.getXform().setSize(90, 25);

        this.mDialog = new engine.Dialog(
            engine.json.get(this.dialogFile),   // The source json for each dialog line
            this.mRenderSet,                    // A GameObjectSet for storing each renderable that is created by DialogLine
            this.mCamera,                       // The game camera, used for its world coordinates
            this.mTextScrollBeep,               // The default text scroll beep, which can be changed with optional json parameters
            this.textbox);                      // The custom textbox image
        this.mDialogGreen = new engine.Dialog(engine.json.get(this.dialogFileGreen), this.mRenderSet, this.mCamera, this.mTextScrollBeep, this.textbox);
        this.mDialogGreen2 = new engine.Dialog(engine.json.get(this.dialogFileGreen2), this.mRenderSet, this.mCamera, this.mTextScrollBeep, this.textbox);
    }

    // This is the draw function, make sure to setup proper drawing environment, and more
    // importantly, make sure to _NOT_ change any state.
    draw() {
        // Step A: clear the canvas
        engine.clearCanvas([0.9, 0.9, 0.9, 1.0]); // clear to light gray

        // Step  B: Activate the drawing Camera
        this.mCamera.setViewAndCameraMatrix();

        // Step  C: Draw everything
        this.mHero.draw(this.mCamera);
        this.mEnemy.draw(this.mCamera);
        this.mEnemy2.draw(this.mCamera);

        //this.mMsg.draw(this.mCamera);
        this.mRenderSet.draw(this.mCamera);
    }
    // The update function, updates the application state. Make sure to _NOT_ draw
    // anything from this function!
    update() {

        let msg = "Brain [H:keys J:imm K:gradual]: ";
        let rate = 1;

        // get the bounding box for collision
        let hBbox = this.mHero.getBBox();
        let bBbox = this.mEnemy.getBBox();
        let bBbox2 = this.mEnemy2.getBBox();
        
        // If the player touches the red enemy, the red enemy dialog activates.
        if(hBbox.intersectsBound(bBbox2)) {
            this.mCurrentDialog = this.mDialog;
            this.mCurrentDialog.activate();
            this.touchedEvil = true;
        }

        // If the player touches the green character BEFORE touching the
        // red enemy, mDialogGreen triggers. If the player touches
        // the green character AFTER touching the red enemy, 
        // the second and final dialog triggers.
        if(hBbox.intersectsBound(bBbox)) {
            if(this.touchedEvil) {
                this.mCurrentDialog = this.mDialogGreen2;
                this.mCurrentDialog.activate();
                this.vanquished = true;
            } else {
                this.mCurrentDialog = this.mDialogGreen;
                this.mCurrentDialog.activate();
            }
        }

        // After the final dialog triggers, "destroy" the red enemy
        // by setting its size to zero.
        if(this.vanquished && !this.mDialogGreen2.isActive()) {
            this.mEnemy2.getXform().setSize(0, 0);
        }
        
        // This handles the update functions for the player and enemies: If there is no current dialog,
        // then the entities can update. If not, then the current dialog updates instead.
        if(this.mCurrentDialog != null && this.mCurrentDialog.isActive()) {
            this.mCurrentDialog.update();
        } else {
            this.mHero.update();
            this.mEnemy.update();
            // The red enemy only updates once the player has touched it.
            if(this.touchedEvil) {
                this.mEnemy2.update();
            }
            // The red enemy only moves towards the player if it is not touching the player.
            if (!hBbox.intersectsBound(bBbox2) && this.touchedEvil) {  // stop the brain when it touches hero bound
                this.mEnemy2.rotateObjPointTo(this.mHero.getXform().getPosition(), rate);
                engine.GameObject.prototype.update.call(this.mEnemy2);  // the default GameObject: only move forward
            }
        }
    }
}



window.onload = function () {
    engine.init("GLCanvas");

    let myGame = new MyGame();
    myGame.start();
}