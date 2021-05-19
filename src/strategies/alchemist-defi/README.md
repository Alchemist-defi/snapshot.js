# Contract call strategy

This contract call is specifically built for AURUM and MIST tokens on the Alchemist Defi Project. 
The specific requirements of that project mean that the total number of AURUM across 2 contracts needs to be calculated. 

This could be adapted for any project looking to check all vaalues in all pools / tokens on a masterchef. 

## Examples

Can be used instead of the erc20-balance-of strategy, the space config will look like this:
If you want to get the balance in this contract ensure you pass in a parameter "getWalletBalance" : true,
There is also an additional function called "tokenPendingFunction" : "pendingAurum",
This is used when the MC contract has a "pending" function which looks at pending rewards not harvested. 


This example below will not check balances of the user wallet, and will check the MIST masterchef pools 18, 19 and 20 for balances. 

```JSON
{
 "strategy": {
            "name": "alchemist-defi",
            "params": {
                "tokenAddress": "0x49207BAA3a7332F0716788aa57B088D499bcc104",
                "masterChefAddress": "0x43404359bb38f5135ab8e25c62902015a49a0074",                
                "getWalletBalance" : false,
                "lpPairAddresses": [
                    {                        
                        "pcsPairAddress": "0xa71F0BB3C029d397B10685f884A3523DA766827d",
                        "pid" : 18 
                    },                    
                    {                        
                        "pcsPairAddress": "0xa3c4006d1957A09CF9b94Af683877aBA03DF1eC9",
                        "pid" : 19 
                    },
                    {                        
                        "pcsTokenAddress": "0x49207BAA3a7332F0716788aa57B088D499bcc104",
                        "pid" : 20 
                    }
                ]
            }
        }
}
```
