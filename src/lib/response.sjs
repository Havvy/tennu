/**
 *
 * A Response is a struct with three fields:
 *
 * intent: "say" | "act" | "notice" | "ctcpRespond" | "ctcpRequest" | "none"
 * message: String | [SingleWordString, String]
 * target: Target
 *
 * The "message" is always a String unless the intent is "ctcp".
 *
 * When the intent is "none", no message should be sent.
 * When the intent is "say" or "notice", a "privmsg" or "notice"
 *      should be sent.
 * When the intent is "ctcp", a CTCP should be sent with the type
 *      being the first value and the body being the second.
 * When the intent is "act", it is equivalent to a CTCP where the
 *      type is "ACTION" and the body is the message.
 *
 *
 * When creating a response from the return value of a handler,
 * what happens depends on the type.
 *
 * undefined:  The intent shall be "none", with the other values left
 *             undefined, since they are unused.
 * string | [string]:  The intent shall be "say", with the value
                       used as the message. The target will be the
                       original channel or query that the handler
                       is responding to.
 * object: The object must have a message property. If there is no
 *         intent property, the intent is set to "say". If there is
 *         a query property, and it is true, then the target is set to
 *         a query of the sender of the message being handled. Otherwise,
 *         it is set to the value of the "target" property on the object,
 *         defaulting to the original channel or query the handler is
 *         responding to.
 *
 **/

module.exports = {
    create: function (handlerResponse, message) {
        if (typeof handlerResponse === "undefined") {
            return {
                intent: "none",
                message: undefined,
                target: undefined
            };
        } else if (typeof handlerResponse === "string" || Array.isArray(handlerResponse)) {
            return {
                intent: "say",
                message: handlerResponse,
                target: message.channel
            };
        } else if (typeof handlerResponse === "object") {
            return {
                message: handlerResponse.message,
                intent: handlerResponse.intent || "say",
                target: handlerResponse.query ? message.nickname : (handlerResponse.target || message.channel)
            };
        } else {
            throw new Error("Bad Response");
        }
    },

    send: function (response, client) {
        const intents = {
            say: function (channel, message) { client.say(channel, message); },
            act: function (channel, message) { client.act(channel, message); },
            notice: function (channel, message) { client.notice(channel, message); },
            none: function () { /* no-op */ },
            ctcpRespond: function (target, args) {
                client.ctcpRespond(target, args[0] /* tag */, args[1] /* message */);
            },
            ctcpRequest: function (target, args) {
                client.ctcpRequest(target, args[0] /* tag */, args[1] /* optional message */);
            }
        };

        intents[response.intent](response.target, response.message);
    }
}