const { ethers } = require("ethers");
const {
  DefenderRelaySigner,
  DefenderRelayProvider,
} = require("@openzeppelin/defender-relay-client/lib/ethers");

exports.handler = async function (data) {
  // Eventos que vienen del sentinel
  // Este evento viene de Sepolia cuando el usuario participa en Airdrop
  const payload = data.request.body.events;

  // Inicializa Proveedor: en este caso es OZP
  const provider = new DefenderRelayProvider(data);

  // Se crea el signer quien será el msg.sender en los smart contracts
  const signer = new DefenderRelaySigner(data, provider, { speed: "fast" });

  // Filtrando solo eventos
  var onlyEvents = payload[0].matchReasons.filter((e) => e.type === "event");
  if (onlyEvents.length === 0) return;

  // Filtrando solo Burn
  var event = onlyEvents.filter((ev) =>
    ev.signature.includes("Burn")
  );
  // Mismos params que en el evento
  var { account } = event[0].params;

  // Ejecutar 'mint' en Goerli del contrato BBitesToken
  var bbitesToken = "0x2bc50bD9eF6b37cefA4076Ccb0D12da2bD7bd48B";
  var tokenAbi = ["function mint(address to, uint256 amount)"];
  var tokenContract = new ethers.Contract(bbitesToken, tokenAbi, signer);
  var tx = await tokenContract.mint(account, ethers.parseUnits('10000', 18));
  var res = await tx.wait();
  return res;
};
