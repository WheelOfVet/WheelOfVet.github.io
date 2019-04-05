//
var game_totalBet = 0;
var profit_WinRate = 0;
var game_MaxBet = 0;
var game_MaxBet_new = 0;
var game_MaxBet_newTRX = 0;
var contract_address = "";
var contract_network = "mainnet";
//
const web32 = new Web3();
var state = {tronWeb:{}};
this.setState = function(st){
	state.tronWeb = st.tronWeb; //alert(state.tronWeb.installed+" - "+state.tronWeb.loggedIn);
	if(window.tronLinkTimer){
		if(state.tronWeb.loggedIn)tronLinkHandle();
	} else{
		tronLinkHandle();
	}
}

async function componentDidMount() {
	//window.tronWeb = new TronWeb("https://api.trongrid.io");
	await $.getJSON("WheelOfFortune.json", function(contracts) {
		contract_address = contracts.networks["5777"].address;console.log("contract_address: "+contract_address)
		contract = {};
		for(var i = 0; i < contracts.abi.length; i++){
			var ABI = contracts.abi[i];
			if(ABI.type == "function")contract[ABI.name] = connex.thor.account(contract_address).method(ABI)
		}
		$("#contractaddresslink").html('Contract address: <a target="_blank" href="https://explore.veforge.com/accounts/'+contract_address+'" >'+contract_address+'</a>');//https://testnet.veforge.com/accounts/
		initGame();
	}).fail(function() {
		console.log( "get contract error" );
	})
}

//
function transformData(message) {
	return {
		player: message.player,
		//toNumber function of TronWeb
		bet_amount: message.bet_amount.toNumber(),
		result_place: message.result_place,//uint8 not use toNumber
		win_amount: message.win_amount.toNumber(),
		time: message.time.toNumber()
	}
}

//
async function initGame() {
	await getProfitWinRate();
	//await getGameMaxBet();
	//await getBalanceContract();
	await getBalanceUser(true);
	//
	/*contract.UserBet().watch((err, { result }) => {
		if(err)return console.error('Failed to bind event listener:', err);
		console.log('Detected new message:', result.id);
		console.log('message:', JSON.stringify(result));
		var id = Number(result.id);
		if(id < game_totalBet)return;
		game_totalBet = id+1;
		if(result.player == tronWeb.defaultAddress.hex){
			addRecentData(result, true);
		} else{
			if(window.timer){
				clearTimeout(window.timer);
				window.timer = null;
			}
			window.timer = setTimeout(function(){getBalanceContract();getBalanceUser();}, 2000);
		}
	});*/
}

function updatePlaceBets(){
	var clause = contract.setPlaceBets.asClause([70,2,70,60,70,3,70,4,70,70,6,70,10,64,60,60,80,80, 1,80], [0,8,0,2,0,6,0,5,0,0,4,0,3,0,2,0,2,0,10,0]);
	clause.comment = "Contract Call (setPlaceBets)";//console.log(JSON.stringify(clause))
	connex.vendor.sign('tx')
			//.signer('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed') // Enforce signer
			//.gas(Number(args.gasLimit)) // Set maximum gas
			//.gasPrice('1000000000000000') // 1 VeThor can buy 1000 gas
			//.link('https://testnet.veforge.com/{txid}')
			//.comment(commentMss)
			.request([clause])
			.then(result=>{
				console.log("-------------Result: "+JSON.stringify(result))
			}).catch(function(error) {
				console.log("-------------Error: "+error);
			});
}

function userBetSend(amount, callBack) {
	if(!amount){
		alert("Please enter the amount to bet!");
		callBack(-1);
		return;
	}
	if(amount < 1){
		alert("Minimum bet is 1 VET");
		callBack(-1);
		return;
	}
	if(game_MaxBet_newTRX && amount > game_MaxBet_newTRX){
		alert("Maximum bet is "+game_MaxBet_newTRX+" VET");
		callBack(-1);
		return;
	}
	waitingDialog.show('');
	var wei = amount*(10**18)+"";
	var clause = contract.userBet.asClause(wei);
	clause.value = wei;
	clause.comment = "Contract Call (userBet)";//console.log(JSON.stringify(clause))
	connex.vendor.sign('tx')
			//.signer('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed') // Enforce signer
			//.gas(Number(args.gasLimit)) // Set maximum gas
			//.gasPrice('1000000000000000') // 1 VeThor can buy 1000 gas
			//.link('https://testnet.veforge.com/{txid}')
			//.comment(commentMss)
			.request([clause])
			.then(result=>{
				//console.log("-------------Result: "+JSON.stringify(result))
				if(result && result.txid)getReceiptTransaction(result.txid);
			}).catch(function(error) {
				//console.log("-------------Error: "+error);
				serverToGameCallback(-1);
			});
			
	/*
	contract.userBet(sun).send({
		callValue: sun,
		//shouldPollResponse: true
	}).then(function(r) {
		if(window.watchAllBetTimer){
			clearTimeout(window.watchAllBetTimer);
			window.watchAllBetTimer = null;
		}
		window.watchAllBetTimer = setTimeout(function(){watchAllBet();},4000);
		if(window.serverToGameTimer){
			clearTimeout(window.serverToGameTimer);
			window.serverToGameTimer = null;
		}
		window.serverToGameTimer = setTimeout(function(){serverToGameCallback(-1);},10000);
	    //console.log("userBet: "+JSON.stringify(r));
	}).catch(function(e) {
	    //console.log("userBet: "+e);
		serverToGameCallback(-1);
	});*/
}

async function pause () { return new Promise((resolve, reject) => { setTimeout(resolve, 500) }) }
async function getReceiptTransaction_2 (txhash, done) {
	return new Promise((resolve, reject) => {
	  	connex.thor.transaction(txhash).getReceipt().then(async receipt=>{
			if(receipt){
				resolve(receipt);return;
			}
			await pause()
        	return resolve(await getReceiptTransaction_2(txhash))
		})
	})
}

function getReceiptTransaction(txid){//alert("1: "+txid);//txid = "0xdcb51125f645b47b70c2b8cad60d710b8657630ef7bbac4a82bcb3bfc203bc95";
	var receipt = getReceiptTransaction_2(txid);
	receipt.then(txData => {//console.log("xxx: "+JSON.stringify(txData.outputs)); 
		if(!txData || txData.outputs.length == 0 || txData.outputs[0].events.length == 0 || !txData.outputs[0].events[0].data){
			serverToGameCallback(-1);
			return;
		}
		var r = web32.eth.abi.decodeParameters([
			{
			  "indexed": false,
			  "name": "bet_amount",
			  "type": "uint256"
			},
			{
			  "indexed": false,
			  "name": "result_place",
			  "type": "uint8"
			},
			{
			  "indexed": false,
			  "name": "win_amount",
			  "type": "uint256"
			},
			{
			  "indexed": false,
			  "name": "id",
			  "type": "uint256"
			}], txData.outputs[0].events[0].data); 
		var bet = {
			//player: message.player,
			//toNumber function of TronWeb
			bet_amount: Number(r[0]),
			result_place: r[1],//uint8 not use toNumber
			win_amount: Number(r[2])
		}
		console.log(bet);
		addRecentData(bet, true);
	}).catch(function(e) {
	    alert("error: "+e);
	});
}
//getReceiptTransaction("0xdcb51125f645b47b70c2b8cad60d710b8657630ef7bbac4a82bcb3bfc203bc95")


function getProfitWinRate() {
	contract.getMaxPrizeRate.call().then(function(r) {
		profit_WinRate = Number(r.decoded[0]);
		getGameMaxBet();
	    console.log("getMaxPrizeRate: "+r.decoded[0]);
	}).catch(function(e) {
	    console.log("getMaxPrizeRate: "+e);
	});
}

function getGameMinBet() {
	contract.gameMinBet.call().then(function(r) {
	    console.log("gameMinBet: "+JSON.stringify(r));
	}).catch(function(e) {
	    console.log("gameMinBet: "+e);
	});
}

function getGameMaxBet() {
	contract.gameMaxBet.call().then(function(r) {
		game_MaxBet = Number(r.decoded[0]);
		getBalanceContract();
	    ///console.log("gameMaxBet: "+JSON.stringify(r));
	    console.log("gameMaxBet: "+r.decoded[0]);
	}).catch(function(e) {
	    console.log("gameMaxBet: "+e);
	});
}

function getBalanceContract() {
	connex.thor.account(contract_address).get().then(function(r) {
	    //console.log("getBalanceContract: "+JSON.stringify(r));
		r = Number(r.balance);
		if(profit_WinRate && r)game_MaxBet_new = Math.floor(r/profit_WinRate);
		if(game_MaxBet && game_MaxBet_new > game_MaxBet)game_MaxBet_new = game_MaxBet;
		if(game_MaxBet_new)game_MaxBet_newTRX = Math.floor(Number(game_MaxBet_new)/(10**18));
		//alert(game_MaxBet_newTRX)
	    console.log("getBalanceContract: "+r);
	}).catch(function(e) {
	    console.log("getBalanceContract: "+e);
	});
}

function getBalanceUser(first) {
	START_CREDIT = 500000;
	if(window.s_oGame)s_oGame.updateCredit(START_CREDIT, first);
	/*tronWeb.trx.getBalance(tronWeb.defaultAddress.base58).then(function(r) {
		START_CREDIT = Number(tronWeb.fromSun(r));
		if(window.s_oGame)s_oGame.updateCredit(START_CREDIT, first);
	    console.log("getBalanceUser: "+r);
	}).catch(function(e) {
	    console.log("getBalanceUser: "+e);
	});*/
}

async function watchAllBet() {//alert('watchAllBet: 1')
	const currentBet = (await contract.currentBet.call()).toNumber();
	if(currentBet <= game_totalBet)return;
	const nextbet = Math.max(currentBet-10, game_totalBet);
	//console.log("currentBet: "+currentBet+", nextbet: "+nextbet);
	game_totalBet = currentBet;
	var has = false;
	for(var i = game_totalBet-1; i >= nextbet; i--){
		await contract.bets(i).call().then(function(r) {
			var bet = transformData(r);
			console.log("bets: "+JSON.stringify(bet));
			if(bet.player == tronWeb.defaultAddress.hex){
				addRecentData(bet, true);
				i = nextbet;//break
				has = true;
			}
		}).catch(function(e) {
			console.log("bets: "+e);
		});
	}
	if(!has){
		serverToGameCallback(-1);
	}
	
}

//
function serverToGameCallback(resultPlace){
	if(window.s_oGame)s_oGame.serverReturns(resultPlace);
	waitingDialog.hide('');
}

//
function addRecentData(data, watchE){
	if(window.watchAllBetTimer){
		clearTimeout(window.watchAllBetTimer);
		window.watchAllBetTimer = null;
	}
	if(window.timer){
		clearTimeout(window.timer);
		window.timer = null;
	}
	window.timer = setTimeout(function(){getBalanceContract();getBalanceUser();}, 2000);
	//const player = tronWeb.address.fromHex(data.player);
	//const bet_amount = tronWeb.fromSun(data.bet_amount);
	const result_place = data.result_place;
	//const win_amount = tronWeb.fromSun(data.win_amount);
	if(watchE){
		if(window.serverToGameTimer){
			clearTimeout(window.serverToGameTimer);
			window.serverToGameTimer = null;
		}
		if(window.s_oGame)s_oGame.serverReturns(result_place);
		waitingDialog.hide('');
	}
}

//
$( document ).ready(function() {
	state.tronWeb.loggedIn = true;//xxx
	tronLinkTimer = setTimeout(function(){tronLinkHandle()},100);
	//
});

window.onload = function(){
	if(window.connex){
		componentDidMount();
		if(connex.thor && connex.thor.genesis){
			const MAIN_NET_ID = "0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a";
			if(connex.thor.genesis.id != MAIN_NET_ID){
				$("#mainnetModal").modal("show");
			}
		}
	} else{alert("no connex")
	}
}

function tronLinkHandle(){
	if(state.tronWeb.loggedIn){
		game_ready();
		waitingDialog.hide(''); 
		$("#tronLink-loginModal").modal("hide");
		$("#tronLink-installModal").modal("hide");
	} else{
		waitingDialog.hide(''); 
		if(state.tronWeb.installed){
			$("#tronLink-loginModal").modal("show");
		} else{
			$("#tronLink-installModal").modal("show");
		}
	}
	if(window.tronLinkTimer){
		clearTimeout(tronLinkTimer);
		tronLinkTimer = null;
	}
}

var waitingDialog = waitingDialog || (function ($) {
    'use strict';
	// Creating modal dialog's DOM
	var $dialog = $(
		'<div class="modal fade" data-backdrop="static" data-keyboard="false" tabindex="-1" role="dialog" aria-hidden="true" style="padding-top:15%; overflow-y:visible;">' +
		'<div class="modal-dialog modal-m">' +
		'<div class="modal-content">' +
			'<div class="modal-header"><h3 style="margin:0;"></h3></div>' +
			'<div class="modal-body">' +
				'<div class="progress progress-striped active" style="margin-bottom:0;"><div class="progress-bar" style="width: 100%"></div></div>' +
			'</div>' +
		'</div></div></div>');

	return {
		/**
		 * Opens our dialog
		 * @param message Custom message
		 * @param options Custom options:
		 * 				  options.dialogSize - bootstrap postfix for dialog size, e.g. "sm", "m";
		 * 				  options.progressType - bootstrap postfix for progress bar type, e.g. "success", "warning".
		 */
		show: function (message, options) {
			// Assigning defaults
			if (typeof options === 'undefined') {
				options = {};
			}
			if (typeof message === 'undefined') {
				message = 'Loading';
			}
			var settings = $.extend({
				dialogSize: 'm',
				progressType: '',
				onHide: null // This callback runs after the dialog was hidden
			}, options);

			// Configuring dialog
			$dialog.find('.modal-dialog').attr('class', 'modal-dialog').addClass('modal-' + settings.dialogSize);
			$dialog.find('.progress-bar').attr('class', 'progress-bar');
			if (settings.progressType) {
				$dialog.find('.progress-bar').addClass('progress-bar-' + settings.progressType);
			}
			$dialog.find('h3').text(message);
			// Adding callbacks
			if (typeof settings.onHide === 'function') {
				$dialog.off('hidden.bs.modal').on('hidden.bs.modal', function (e) {
					settings.onHide.call($dialog);
				});
			}
			// Opening dialog
			$dialog.modal();
		},
		/**
		 * Closes dialog
		 */
		hide: function () {
			$dialog.modal('hide');
		}
	};

})(jQuery);