const { compose } = require('compose-middleware')
const { sse } = require("@toverux/expresse")

module.exports = function(getHub) {

    function middleware(req, res, next) {
        const hub = getHub(req, res)

        if (!hub) {
            return res.status(404).end()
        }

        //=> Register the SSE functions of that client on the hub
        hub.register(res.sse);

        //=> Unregister the user from the hub when its connection gets closed (close=client, finish=server)
        res.once('close', () => hub.unregister(res.sse));
        res.once('finish', () => hub.unregister(res.sse));

        //=> Make hub's functions available on the response
        res.sse.broadcast = {
            data: hub.data.bind(hub),
            event: hub.event.bind(hub),
            comment: hub.comment.bind(hub),
        };

        //=> Done
        next();
    }

    return compose(sse(), middleware);
}