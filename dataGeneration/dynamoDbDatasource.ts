import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

export async function putItem(
  item: object,
  table: string,
  ddbDocClient: DynamoDBDocumentClient
): Promise<void> {
  const params = {
    TableName: table,
    Item: marshall(item),
  };

  await ddbDocClient.send(new PutItemCommand(params));
}
