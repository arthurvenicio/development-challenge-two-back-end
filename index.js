const AWS = require("aws-sdk");

AWS.config.update({
  region: "us-east-2",
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = "patients-info";

const patientPath = "/patient";
const patientsPath = "/patients";

exports.handler = async function (event) {
  console.log("Request event:", event);

  let response;

  switch (true) {
    case event.httpMethod === "GET" && event.path === patientPath:
      response = await getPatient(event.queryStringParameters.pateientId);
      break;
    case event.httpMethod === "POST" && event.path === patientPath:
      response = await createPatient(JSON.parse(event.body));
      break;
    case event.httpMethod === "PUT" && event.path === patientPath:
      const requestBody = JSON.parse(event.body);
      response = await updatePatient(
        requestBody.pateientId,
        requestBody.firstName,
        requestBody.lastName,
        requestBody.idCard,
        requestBody.zipCode,
        requestBody.country,
        requestBody.birthDate
      );
      break;
    case event.httpMethod === "DELETE" && event.path === patientPath:
      response = await deletePatient(event.queryStringParameters.pateientId);
      break;
    case event.httpMethod === "GET" && event.path === patientsPath:
      response = await getPatients();
      break;
    default:
      response = createResponse(404, "404 Not Found");
  }
  return response;
};

async function getPatient(pateientId) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      pateientId: pateientId,
    },
  };
  return await dynamodb
    .get(params)
    .promise()
    .then(
      (response) => {
        return createResponse(200, response.Item);
      },
      (error) => {
        console.error(
          "Do your custom error handling here. I am just gonna log it: ",
          error
        );
      }
    );
}

async function getPatients() {
  const params = {
    TableName: dynamodbTableName,
  };
  const allPatients = await scanDynamoRecords(params, []);
  const body = {
    patients: allPatients,
  };
  return createResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch (error) {
    console.error(
      "Do your custom error handling here. I am just gonna log it: ",
      error
    );
  }
}

async function createPatient(requestBody) {
  const params = {
    TableName: dynamodbTableName,
    Item: requestBody,
  };
  return await dynamodb
    .put(params)
    .promise()
    .then(
      () => {
        const body = {
          Operation: "SAVE",
          Message: "SUCCESS",
          Item: requestBody,
        };
        return createResponse(200, body);
      },
      (error) => {
        console.error(
          "Do your custom error handling here. I am just gonna log it: ",
          error
        );
      }
    );
}

async function updatePatient(
  pateientId,
  firstName,
  lastName,
  idCard,
  zipCode,
  country,
  birthDate
) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      pateientId: pateientId,
    },
    UpdateExpression: `set firstName = :firstName, lastName = :lastName, idCard = :idCard, zipCode = :zipCode, country = :country, birthDate = :birthDate`,
    ExpressionAttributeValues: {
      ":firstName": firstName,
      ":lastName": lastName,
      ":idCard": idCard,
      ":zipCode": zipCode,
      ":country": country,
      ":birthDate": birthDate,
    },
    ReturnValues: "UPDATED_NEW",
  };
  return await dynamodb
    .update(params)
    .promise()
    .then(
      (response) => {
        const body = {
          Operation: "UPDATE",
          Message: "SUCCESS",
          UpdatedAttributes: response,
        };
        return createResponse(200, body);
      },
      (error) => {
        console.error(
          "Do your custom error handling here. I am just gonna log it: ",
          error
        );
      }
    );
}

async function deletePatient(pateientId) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      pateientId: pateientId,
    },
    ReturnValues: "ALL_OLD",
  };
  return await dynamodb
    .delete(params)
    .promise()
    .then(
      (response) => {
        const body = {
          Operation: "DELETE",
          Message: "SUCCESS",
          Item: response,
        };
        return createResponse(200, body);
      },
      (error) => {
        console.error(
          "Do your custom error handling here. I am just gonna log it: ",
          error
        );
      }
    );
}

function createResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}
