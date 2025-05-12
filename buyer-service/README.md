# Buyer Service

### Commands
```bash 
sam validate
```
```bash 
sam build
```
```bash 
sam deploy --stack-name buyer-service --parameter-overrides DynamicPricingApiId= BillingApiId= ParcelManagementApiId=
```
```bash 
sam sync --stack-name buyer-service --watch
```
```bash 
sam delete
```