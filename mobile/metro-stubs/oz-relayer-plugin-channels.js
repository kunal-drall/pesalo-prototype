// Mobile-side shim for @openzeppelin/relayer-plugin-channels. The real
// package re-exports both ./client (which we use to submit relayed
// transactions) and ./plugin (server-side OZ Relayer plugin code that
// pulls in the full Stellar SDK + Node-only deps and trips a deep
// `Cannot read property 'slice' of undefined` at module-load in RN).
// Pesalo never runs the relayer, so the plugin half is dead weight.
module.exports = require("@openzeppelin/relayer-plugin-channels/dist/client");
