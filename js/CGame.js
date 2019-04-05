function CGame(oData){
    
    var _bInitGame;
    
    var _iScore;
    var _iTimeIdle;
    var _iTimeWin;
    var _iCurAnim;
    var _iGameState;
    var _iMultiply;
    var _iCurBet;
    var _iCurCredit;
    var _iCurWin;
    var _iAdCounter;
    var _iBankCash;

    var _aProbability;

    var _oInterface;
    var _oEndPanel = null;
    var _oParent;
    var _oWheel;
    var _oLeds;
    
    this._init = function(){
     
        _iMultiply = 1;
        _iTimeIdle = 0;
        _iTimeWin = 0;
        _iCurBet = START_BET;
        _iCurCredit = START_CREDIT;
        _iCurWin = -1;        
        _iGameState = STATE_IDLE;
        _iAdCounter = 0;
        _iBankCash = BANK_CASH;

        _aProbability = new Array();
        var iCount=0;
        for(var i=0; i<WHEEL_SETTINGS.length; i++){
            iCount += WHEEL_SETTINGS[i].win_occurence;
        }
        if(iCount !== 100){
            var oBg = createBitmap(s_oSpriteLibrary.getSprite('msg_box'));
            s_oStage.addChild(oBg);
            
            var oAlertText = new createjs.Text(TEXT_ALERT,"bold 50px "+SECONDARY_FONT, "#ffffff");
            oAlertText.x = CANVAS_WIDTH/2;
            oAlertText.y = CANVAS_HEIGHT/2 - 200;
            oAlertText.textAlign = "center";
            oAlertText.textBaseline = "middle";
            oAlertText.lineWidth = 900;
            s_oStage.addChild(oAlertText);
            
            return;
        }
		
		//tron 
		//prize_server =       [0    ,8    ,0    ,2    ,0    ,6    ,0    ,5    ,0    ,0    ,4    ,0    ,3    ,0    ,2    ,0    ,2    ,0    ,10   ,0];alert(prize_server.length)
		win_occurence_server = [48   ,15   ,56   ,60   ,60   ,20   ,64   ,25   ,58   ,64   ,30   ,56   ,50   ,56   ,60   ,60   ,80   ,68   ,10   ,60];
		//test
		var winTotal = 0;
		var pre = 0;
		var cur = 0;
        for(var i=0; i<win_occurence_server.length; i++){
			cur+=win_occurence_server[i];
			console.log("wheel "+i+": from "+pre+" to "+(cur-1)+", Prize: "+WHEEL_SETTINGS[i].prize) 
			pre = cur;  
        }
		//for(var i = 0; i < win_occurence_server.length; i++)winTotal+=win_occurence_server[i];
		//alert(win_occurence_server.length+": "+winTotal);

        _bInitGame=true;
        var pCenterWheel = {x: 1198, y: 540};

        _oWheel = new CWheel(pCenterWheel.x, pCenterWheel.y);
        
        var oBg = createBitmap(s_oSpriteLibrary.getSprite('bg_game'));
        s_oStage.addChild(oBg);

        _oLeds = new CLeds(pCenterWheel.x, pCenterWheel.y);
        _iCurAnim = _oLeds.getState();

        _oInterface = new CInterface(); 
        
        //new CHelpPanel();tron
        
        this._initProbability();
		
		/*if(_iCurCredit < START_BET){tron
            this.gameOver();
			return;
        } */
    };
    
    this._initProbability = function(){
        var aPrizeLength = new Array();
        for(var i=0; i<WHEEL_SETTINGS.length; i++){
            aPrizeLength[i] = WHEEL_SETTINGS[i].win_occurence;  
        }
        for(var i=0; i<aPrizeLength.length; i++){
            for(var j=0; j<aPrizeLength[i]; j++){
                _aProbability.push(i);
            }            
        }   
		    
    };
    
    this.modifyBonus = function(szType){
        if(szType === "plus"){
            _iCurBet += BET_OFFSET;
        } else {
            _iCurBet -= BET_OFFSET;
        }

		if(_iCurBet > game_MaxBet_newTRX){
            _iCurBet = game_MaxBet_newTRX;
        } else if(_iCurBet < 0){
            _iCurBet = 0;
        } 
		if(_iCurBet > _iCurCredit){
            _iCurBet = Math.floor(_iCurCredit);
        }
        _oInterface.refreshBet(_iCurBet);
		
        //_oWheel.clearText(_iMultiply);
        //_oWheel.setText(_iMultiply);
        
        
    };
    
    this.tryShowAd = function(){
        _iAdCounter++;
        if(_iAdCounter === AD_SHOW_COUNTER){
            _iAdCounter = 0;
            $(s_oMain).trigger("show_interlevel_ad");
        }
    }
	//tron
	this.updateCredit = function(Credit, updateText){
		_iCurCredit = Credit;
        if(updateText)_oInterface.refreshCredit(_iCurCredit.toFixed(2)/1);
	}
    //tron
	this.spinWheel = function(){//this.spinWheel2();return;
		if(window.wallet_requesting)return;
		window.wallet_requesting = true;
        _oInterface.disableSpin(true);
		//
		userBetSend(_iCurBet, this.serverReturns);
	}
	//tron
	this.serverReturns = function(sr){
		if(!window.wallet_requesting)return;
		window.wallet_requesting = false;
		//
		if(sr == -1){
        	_oInterface.disableSpin(false);
		} else{
			this.spinWheel2(true, sr);
		}
	}
	//tron
    this.spinWheel2 = function(server, serverReturns){
        _iGameState = STATE_SPIN;
        _iTimeWin = 0;
        
        this.setNewRound();
        
        _oInterface.refreshMoney("0");
        _oInterface.refreshCredit(_iCurCredit);
		
		if(server){
			_iCurWin = serverReturns;
		} else{
        	_oInterface.disableSpin(true);
			//DETECT ALL POSSIBLE PRIZE LOWER THEN BANK
			var iCurPrize;
			var aAllPossiblePrize = new Array();
			for(var i=0; i<_aProbability.length; i++){
				iCurPrize = WHEEL_SETTINGS[_aProbability[i]].prize*_iMultiply;
				if(iCurPrize <= _iBankCash){
					aAllPossiblePrize.push({prize:iCurPrize,index:i});
				} 
			}
			//console.log("hh: "+aAllPossiblePrize)
			//SELECT PRIZE   
			var rand = Math.floor(Math.random()*aAllPossiblePrize.length);
			var iPrizeToChoose = aAllPossiblePrize[rand].index;     
			_iCurWin = _aProbability[iPrizeToChoose];
			console.log("rand: "+rand+", iPrizeToChoose: "+iPrizeToChoose) 
			console.log("_iCurWin: "+_iCurWin);
			
			//tron test
			var pre = 0;
			var cur = 0;
			for(var i=0; i<WHEEL_SETTINGS.length; i++){
				cur+=WHEEL_SETTINGS[i].win_occurence;
				//console.log("wheel "+i+": from "+pre+" to "+(cur-1)) 
				if(rand >= pre && rand < cur){
					console.log("iCurWin tron: "+i+", Prize: "+WHEEL_SETTINGS[i].prize);break;
				}
				pre = cur;  
			}
		}

        //CALCULATE ROTATION
        var iNumSpinFake = MIN_FAKE_SPIN + Math.floor(Math.random()*3);
        var iOffsetInterval = SEGMENT_ROT - 3;
        var iOffsetSpin = -iOffsetInterval/2 + Math.random()*iOffsetInterval;//Math.round(Math.random()*iOffsetInterval);
        var _iCurWheelDegree = _oWheel.getDegree();
        
        var iTrueRotation = (360 - _iCurWheelDegree + _iCurWin * SEGMENT_ROT + iOffsetSpin)%360; //Define how much rotation, to reach the selected prize.
        var iRotValue = 360*iNumSpinFake + iTrueRotation;
        var iTimeMult = iNumSpinFake;
        //SPIN
        _oWheel.spin(iRotValue, iTimeMult);
    };                 
    
    this.setNewRound = function(){
        if(_iCurWin < 0)return;
        _oInterface.refreshCredit(_iCurCredit);
        _oInterface.clearMoneyPanel();
        _iCurWin = -1;
    };
    
    this.releaseWheel = function(){
        _oInterface.disableSpin(false); 
        _oInterface.refreshMoney(WHEEL_SETTINGS[_iCurWin].prize * _iCurBet);//tron
        //$(s_oMain).trigger("save_score",[_iCurCredit]);
        _oInterface.refreshCredit(_iCurCredit);
        _oInterface.animWin();
        /*if(_iCurCredit < START_BET){tron
            this.gameOver();
        }  */  
		if(_iCurBet > _iCurCredit ){
            _iCurBet = Math.floor(_iCurCredit);
            _oInterface.refreshBet(_iCurBet);
        }
		if(_iCurBet > game_MaxBet_newTRX){
            _iCurBet = game_MaxBet_newTRX;
            _oInterface.refreshBet(_iCurBet);
        }
        
        if(WHEEL_SETTINGS[_iCurWin].prize <= 0){
            _iGameState = STATE_LOSE;
            if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
                createjs.Sound.play("game_over");
            }
        } else {
            _iGameState = STATE_WIN;
            if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
                createjs.Sound.play("win");
            }
        }
    };
    
    this.getCurColor = function(){
        return _oWheel.getColor();
    };
    
    this.unload = function(){
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
                createjs.Sound.stop();
        }
        _bInitGame = false;
        
        _oInterface.unload();
        if(_oEndPanel !== null){
            _oEndPanel.unload();
        }
        
        createjs.Tween.removeAllTweens();
        s_oStage.removeAllChildren();
        
    };
 
    this.onExit = function(){
        
        $(s_oMain).trigger("save_score",[_iCurCredit]);
        $(s_oMain).trigger("share_event",_iCurCredit);
        
        this.unload();
        s_oMain.gotoMenu();
        
        
    };
    
    this.gameOver = function(){  
        
        _oEndPanel = CEndPanel(s_oSpriteLibrary.getSprite('msg_box'));
        _oEndPanel.show();
    };

    this._animLedIdle = function(){
        _iTimeIdle += s_iTimeElaps;
        
        if(_iTimeIdle > TIME_ANIM_IDLE){
            _iTimeIdle=0;
            var iRandAnim = Math.floor(Math.random()*_oLeds.getNumAnim());
    
            while(iRandAnim === _iCurAnim){
                iRandAnim = Math.floor(Math.random()*_oLeds.getNumAnim());
            }    
            _oLeds.changeAnim(iRandAnim);
            _iCurAnim = iRandAnim;
        }
    };    
    
    this._animLedSpin = function(){
        _oLeds.changeAnim(LED_SPIN);
        _iGameState =-1;
    };
    
    this._animLedWin = function(){
       
        if(_iTimeWin === 0){
            var iRandomWinAnim = 4 + Math.round(Math.random())
            _oLeds.changeAnim(iRandomWinAnim);
            _oLeds.setWinColor(this.getCurColor());            
        } else if(_iTimeWin > TIME_ANIM_WIN) {
            _iTimeIdle = TIME_ANIM_IDLE; 
            _iGameState = STATE_IDLE;
            this.setNewRound();
            _iTimeWin =0;
        }
        _iTimeWin += s_iTimeElaps;
        
    };
    
    this._animLedLose = function(){
       
        if(_iTimeWin === 0){            
            _oLeds.changeAnim(6);
            _oLeds.setWinColor(this.getCurColor());            
        } else if(_iTimeWin > TIME_ANIM_LOSE) {
            _iTimeIdle = TIME_ANIM_IDLE; 
            _iGameState = STATE_IDLE;
            this.setNewRound();
            _iTimeWin =0;
        }
        _iTimeWin += s_iTimeElaps;
        
    };
    
    this.update = function(){
	if(_bInitGame){
            _oLeds.update();
        
            switch(_iGameState) {
                case STATE_IDLE:{
                        this._animLedIdle();
                   break;
                } case STATE_SPIN: {
                        this._animLedSpin();
                   break;              

                } case STATE_WIN: {
                        this._animLedWin();
                   break;                             
                } case STATE_LOSE: {
                        this._animLedLose();
                   break;                             
                }    

            }
        }
        
    };

    s_oGame=this;
    
    WHEEL_SETTINGS = oData.wheel_settings;
    
    //START_CREDIT = oData.start_credit;tron
    START_BET = oData.start_bet;
    BET_OFFSET = oData.bet_offset;
    MAX_BET = oData.max_bet;
    
    TIME_ANIM_IDLE = oData.anim_idle_change_frequency;
    ANIM_IDLE1_TIMESPEED = oData.led_anim_idle1_timespeed;
    ANIM_IDLE2_TIMESPEED = oData.led_anim_idle2_timespeed;
    ANIM_IDLE3_TIMESPEED = oData.led_anim_idle3_timespeed;
    
    ANIM_SPIN_TIMESPEED = oData.led_anim_spin_timespeed;
    
    TIME_ANIM_WIN = oData.led_anim_win_duration;
    ANIM_WIN1_TIMESPEED = oData.led_anim_win1_timespeed;
    ANIM_WIN2_TIMESPEED = oData.led_anim_win2_timespeed;
    
    TIME_ANIM_LOSE = oData.led_anim_lose_duration;
    
    AD_SHOW_COUNTER = oData.ad_show_counter;
    
    BANK_CASH = oData.bank_cash;
    ENABLE_FULLSCREEN = oData.fullscreen;
	
    _oParent=this;
    this._init();
}

var s_oGame;
