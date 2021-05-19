import { formatUnits } from '@ethersproject/units';
import { multicall } from '../../utils';
import { BigNumber } from '@ethersproject/bignumber';
import { getAddress } from '@ethersproject/address';

export const author = 'alchemist-defi';
export const version = '0.1.0';


// ABI for PancakeSwap Liquidity Pools
const lpAbi = [
    // to get a user/pool balance from masterchef
    {
        inputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            },
            {
                internalType: 'address',
                name: '',
                type: 'address'
            }
        ],
        name: 'userInfo',
        outputs: [
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256'
            },
            {
                internalType: 'uint256',
                name: 'rewardDebt',
                type: 'uint256'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    // to get supply/reserve from pair
    {
        constant: true,
        inputs: [],
        name: 'totalSupply',
        outputs: [
            {
                internalType: 'uint256',
                name: 'totalSupply',
                type: 'uint256'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        constant: true,
        inputs: [],
        name: 'getReserves',
        outputs: [
            {
                internalType: 'uint112',
                name: '_reserve0',
                type: 'uint112'
            },
            {
                internalType: 'uint112',
                name: '_reserve1',
                type: 'uint112'
            },
            {
                internalType: 'uint32',
                name: '_blockTimestampLast',
                type: 'uint32'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        constant:true,
        inputs:[],
        name: 'token0',
        outputs:[
           {
              internalType: 'address',
              name: 'token0',
              type:'address'
           }
        ],
        payable:false,
        stateMutability:'view',
        type:'function'
     },
     {
        constant:true,
        inputs:[],
        name:'token1',
        outputs:[
           {
              internalType:'address',
              name:'token1',
              type:'address'
           }
        ],
        payable:false,
        stateMutability:'view',
        type:'function'
     },
     {
        inputs: [
          {
            internalType: "uint256",
            name: "_pid",
            type: "uint256"
          },
          {
            internalType: "address",
            name: "_user",
            type: "address"
          }
        ],
        name: "pendingAurum",
        outputs: [
          {
            internalType: "uint256",
            name: "pendingAurum",
            type: "uint256"
          }
        ],
        stateMutability: "view",
        type: "function"
      },
      // balanceOf
    {
      "constant":true,
      "inputs":[{"name":"_owner","type":"address"}],
      "name":"balanceOf",
      "outputs":[{"name":"balance","type":"uint256"}],
      "type":"function"
    },
    // decimals
    {
      "constant":true,
      "inputs":[],
      "name":"decimals",
      "outputs":[{"name":"","type":"uint8"}],
      "type":"function"
    }
];


// holding value to get the total number of items in chunk.
let slicerArrayMarker : number;

// Main function for processing return values. 
// As the responses come from a multicall, we need to establish which response exists for what pool type and then count the values
function processReturnValues <T> (responseArr: T[], optionValues: any): number{

    let currentPosition = 0;
    let lpChunkSize = 5;   

    // check to see if no pending call made, reduce chunk size to 5
    if (optionValues.tokenPendingFunction != null){      
      lpChunkSize = 6;
    }

    const tokenChunkSize = 2;
    const checkSumTokenAddress = getAddress(optionValues.tokenAddress)

    const lpPairAddressesValues = optionValues.lpPairAddresses
    let aurumOwned = BigNumber.from(0);

    // if the getwallet parameter is set, then slice up the array and add to the balance. 
    // allows the use of a parameter to establish if this plugin needs to get the wallet balance
    if (optionValues.getWalletBalance != null && optionValues.getWalletBalance){
      // slice out the first response (this is the balance of the wallet)
      let tokenBalanceArr = responseArr.slice(0,1)
      if (tokenBalanceArr[0]["balance"] != null ){
        aurumOwned = aurumOwned.add(tokenBalanceArr[0]["balance"])
      }
      responseArr = responseArr.slice(1,responseArr.length)
    }
    
    // go through the options and establish pool types LP or Token. 
    for (let i = 0, j = lpPairAddressesValues.length; i < j; i += 1) {
        let poolConfig = lpPairAddressesValues[i]
        //check to see if this is a pair or a pool 
        if (poolConfig.pcsPairAddress != null){
            // this is a pair (LP Token)

            let v = responseArr.slice(currentPosition,currentPosition + lpChunkSize)
            currentPosition = currentPosition + lpChunkSize    
            
            // check to see which token is the ARUM token 
            // calculate the aurum amount using the ratio
            // currentOwned% = current owned LP's as % of total pool LPs            
            // multiply total resereve for aurum token by owned %
            let lpsOwned = BigNumber.from(0);
            lpsOwned = v[0]["amount"]

            // get address gets a checksummed version to ensure it can be compared as a string
            const token0Address = getAddress(v[3]["token0"])
            const token1Address = getAddress(v[4]["token1"])
            
            const totalLPSupply = v[1]["totalSupply"];

            let reserveTotal0 =  BigNumber.from(0);            
            reserveTotal0 = v[2]["_reserve0"];

            let reserveTotal1  = BigNumber.from(0);
            reserveTotal1 = v[2]["_reserve1"];

            const precision = BigNumber.from(10).pow(18);            
            let pendingAurum = BigNumber.from(0);
            // check to see if the there is a pending function submitted. If submitted get it from the last spot in the array
            if (optionValues.tokenPendingFunction != null){
              pendingAurum = v[lpChunkSize-1][optionValues.tokenPendingFunction]
            }

            // check to see if the token address is Token 0 or Token 1 in the LP
            if (checkSumTokenAddress != null && checkSumTokenAddress == token0Address){
                const tokensPerLp = reserveTotal0.mul(precision).div(totalLPSupply);                
                let aurumInPool = lpsOwned.mul(tokensPerLp).div(precision)
                aurumOwned = aurumOwned.add(aurumInPool).add(pendingAurum)
            }else if (checkSumTokenAddress != null && checkSumTokenAddress == token1Address){
                const tokensPerLp = reserveTotal1.mul(precision).div(totalLPSupply);                
                let aurumInPool = lpsOwned.mul(tokensPerLp).div(precision)
                aurumOwned = aurumOwned.add(aurumInPool).add(pendingAurum)
                
            }          
        }else{
            // this is a pool (Single token)
            let tk = responseArr.slice(currentPosition,currentPosition + tokenChunkSize)
            currentPosition = currentPosition + tokenChunkSize            
            const aurumInPool = tk[0]["amount"]            
            let pendingAurum = BigNumber.from(0);
            // check to see if the there is a pending function submitted. If submitted get it from the last spot in the array
            if (optionValues.tokenPendingFunction != null){
              pendingAurum = tk[tokenChunkSize-1][optionValues.tokenPendingFunction]
            }

            aurumOwned = aurumOwned.add(aurumInPool).add(pendingAurum);
        }
        
    }
    
    return makeSmallNumber(aurumOwned,18);

}

// function to slice up an array based on chunk size. 
function arrayChunk<T>(arr: T[], chunkSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0, j = arr.length; i < j; i += chunkSize) {
    result.push(arr.slice(i, i + chunkSize));
  }
  return result;
}

function makeSmallNumber(value : BigNumber, precision : number): number {
    let returnNumber = 0
    return parseFloat(formatUnits(value.toString(), precision || 18));    
}

// calls is a 1-dimensional array so we just push 3 calls for every address
const getCalls = (addresses: any[], options: any) => {
    const result: any[] = [];
    for (let address of addresses) {        
        // for each address check the balance of the token in question in the wallet
        // for setup's where balace-of is used, pass false here as you dont want to double up on the balance total        
        if (options.getWalletBalance != null && options.getWalletBalance){
          result.push([options.tokenAddress, 'balanceOf', [address]]);   
        }        
        for (let lpPair of options.lpPairAddresses){                        
            result.push([options.masterChefAddress, 'userInfo', [lpPair.pid, address]]);
            //check to see if this is a pair or a token. If its a pair we need the total supply and reserves
            if (lpPair.pcsPairAddress != null) {
                result.push([lpPair.pcsPairAddress, 'totalSupply', []]);
                result.push([lpPair.pcsPairAddress, 'getReserves', []]);
                result.push([lpPair.pcsPairAddress, 'token0', []]);
                result.push([lpPair.pcsPairAddress, 'token1', []]);
            }  
            // check to see if there is a pending function passed. If passed, check the masterchef contract for pending non distributed shares
            // keep this at the end so that the order of the function calls is the process function doesnt get messed up
            if (options.tokenPendingFunction != null) {
              result.push([options.masterChefAddress, options.tokenPendingFunction, [lpPair.pid, address]]);
            }            
                
        }    
        
        if (slicerArrayMarker == null){
          slicerArrayMarker  = result.length
        }
    }
    
    return result;
};


export async function strategy(
    space,
    network,
    provider,
    addresses,
    options,
    snapshot
) {

    const blockTag = typeof snapshot === 'number' ? snapshot : 'latest';
   
    const response = await multicall(
        network,
        provider,
        lpAbi,
        getCalls(addresses, options),
        { blockTag }
    );

    return Object.fromEntries(
      // chunk to response so that we can process values for each address
      arrayChunk(
        response,
        slicerArrayMarker, 
      ).map((value, i) => [addresses[i], processReturnValues(value, options)])
    );

    
}
