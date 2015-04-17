var _ = require('lodash');
var Promise = require('es6-promise').Promise;

var abi = require('../libs/abi');
var constants = require('../libs/constants');
var utlities = require('../libs/utilities');


function MissingContractError(contractName) {
  this.name = 'MissingContractError';
  this.message = contractName;
}

/**
 * Augur is implemented as several Ethereum contracts, mainly due to size
 * limitations. EthereumClient wraps the calls to those contracts to abstract
 * the contract details from the rest of the codebase.
 *
 * @param {object} [addresses] - The address for each contract, keyed as defined in abi.js.
 * @param {object} [web3] - The web3 object to use to access Ethereum data.
 */
function EthereumClient(account, addresses, web3) {

  this.account = account;
  this.addresses = addresses || {};
  this.web3 = web3 || require('web3');

  this.contracts = {};
  _.defaults(this.addresses, constants.addresses);
}

/**
 * Get the contract object for the given contract name. If it hasn't been
 * created yet, create and store it.
 *
 * @param name - The name of the contract to get. See abi.js.
 * @returns {Contract}
 */
EthereumClient.prototype.getContract = function (name) {
  var contract = this.contracts[name];
  if (_.isUndefined(contract)) {
    var contractAbi = abi[name];
    var address = this.addresses[name];
    if (_.isUndefined(address) || _.isUndefined(contractAbi)) {
      throw new MissingContractError(name);
    }

    var Contract = web3.eth.contract(contractAbi);
    contract = new Contract(address);
    this.contracts[name] = contract;
  }

  return contract;
};

/**
 * Get information about all available branches.
 *
 * @returns {object} Branch information keyed by branch ID.
 */
EthereumClient.prototype.getBranches = function () {
  var branchContract = this.getContract('branches');
  var reportingContract = this.getContract('reporting');
  var account = this.account;

  var branchList = _.map(branchContract.call().getBranches(), function(branchId) {

    var storedRep = reportingContract.call().getRepBalance(branchId, account);
    var rep = storedRep.dividedBy(new BigNumber(2).toPower(64)).toNumber();
    var marketCount = branchContract.call().getNumMarkets(branchId).toNumber();
    var periodLength = branchContract.call().getPeriodLength(branchId).toNumber();
    var branchName = branchId == 1010101 ? 'General' : 'Unknown';  // HACK: until we're actually using multi-branch

    return {
      id: branchId.toNumber(),
      name: branchName,
      periodLength: periodLength,
      rep: rep,
      marketCount: marketCount
    };
  });

  var branches = _.indexBy(branchList, 'id');
  return branches;
};

EthereumClient.prototype.getMarkets = function (branchId) {

  var branchContract = this.getContract('branches');
  var marketContract = this.getContract('market');
  var account = this.account;

  var marketList = _.map(branchContract.call().getMarkets(branchId), function(marketId) {

    var desc = 'Placeholder';   // NEED
    var events = marketContract.call().getMarketEvents(marketId);
    var alpha = marketContract.call().getAlpha(marketId).toNumber();
    var author = 'Placeholder';   // NEED
    var endDate = new Date();   // NEED or calc from events
    var traderCount = marketContract.call().getCurrentParticipantNumber(marketId).toNumber();
    var tradingPeriod = marketContract.call().getTradingPeriod(marketId).toNumber();
    var tradingFee = marketContract.call().getTradingFee(marketId).toNumber();
    var traderId =  marketContract.call().getParticipantNumber(marketId, account);

    var outcomeCount = marketContract.call().getMarketNumOutcomes(marketId);
    var outcomes = _.map( _.range(outcomeCount), function (outcomeId) {

      var id = BigNumber(outcomeId);

      return {
        price: marketContract.call().price(marketId, id),
        sellPrice: marketContract.call().getSimulatedSell(marketId, id),
        buyPrice: marketContract.call().getSimulatedBuy(marketId, id),
        volume: 0,   // NEED
        priceHistory: [],  // NEED
        sharesPurchased: marketContract.call().getParticipantSharesPurchased(marketId, traderId, id),
        totalSharePurchased: marketContract.call().getSharesPurchased(marketId, id)
      }
    });

    var winningOutcomes = marketContract.call().getWinningOutcomes(marketId);

    return {
      id: marketId.toNumber(),
      desc: desc,
      alpha: alpha,
      author: author,
      endDate: endDate,
      traderCount: traderCount,
      tradingPeriod: tradingPeriod,
      tradingFee: tradingFee,
      traderId: traderId,
      events: events,
      outcomes: outcomes
    };
  });

  var markets = _.indexBy(marketList, 'id');
  return markets;
};

module.exports = EthereumClient;