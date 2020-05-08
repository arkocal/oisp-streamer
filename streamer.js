const Keycloak = require('keycloak-connect');
const validator = require('validator');
const WebSocket = require('ws');
const {Kafka} = require('kafkajs');
const uuid = require('uuid');

var KAFKA_URI = process.env.KAFKA_URI;
var WSS_PORT = process.env.WSS_PORT;

var keycloak = new Keycloak({});
const kafka = new Kafka({
    brokers: [KAFKA_URI]
})

function getAccessibleAccounts(rawToken) {
    var grantData = {
	access_token: rawToken
    };
    console.log("raw token:" + rawToken);
    return keycloak.grantManager.createGrant(grantData).then(grant => {
	return grant.access_token.content.accounts;
    }).catch(err => {
	console.log("caught error:" + err);
	return [];
    });
}


async function run(ws, kafkaConsumer) {
    await kafkaConsumer.run({
	eachMessage: async ({ topic, partition, message }) => {
	    console.log({
		value: message.value.toString(),
	    })
	    ws.send(message.value.toString());
	},
    })
}

// WSS stuff
const wss = new WebSocket.Server({ port: WSS_PORT });
var wsKafkaConsumers = {}

/**
 * Disconnect all kafka consumers for the client.
 */
async function disconnectAll(wsId) {
    if (typeof wsKafkaConsumers[wsId] === 'undefined') {
	return;
    }
    wsKafkaConsumers[wsId].forEach( function (consumer) {
	consumer.disconnect();
    });
}

wss.on('connection', function connection(ws) {
    ws.id = uuid.v4();
    ws.on('message', function incoming(message) {
	disconnectAll(ws.id);
	wsKafkaConsumers[ws.id] = [];
	const messageJson = JSON.parse(message);
	accounts = getAccessibleAccounts(messageJson.token);

	messageJson.components.forEach( function (accComp) {
	    const acc = accComp[0];
	    const comp = accComp[1];
	    if (!(validator.isUUID(acc) && validator.isUUID(comp))) {
		// TODO write down protocol
		ws.send('Invalid Input');
		console.log("Actually VERY SERIOUS PROBLEM, allowing for dev");
	    }
	    if (accounts.includes(acc)) {
		const topic = "metrics." + accComp.join(".");
		// TODO clear group
		// TODO clear timing (only from now/last minute etc.)
		var newConsumer = kafka.consumer({groupId: "other-group"});
		newConsumer.connect();
		newConsumer.subscribe({topic: topic, fromBeginning:false});
		wsKafkaConsumers[ws.id].push(newConsumer);
		run(ws, newConsumer);
	    }
	    else {
		ws.send('Invalid Token For Account ' + acc);
	    }
	});
	// TODO write down protocol
	ws.send('OK');
    });
    ws.on('close', function () {
	disconnectAll(ws.id);
	delete wsKafkaConsumers[ws.id];
    });
});
