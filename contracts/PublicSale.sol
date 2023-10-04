// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IUniSwapV2Router02} from "./Interfaces.sol";

contract PublicSale is Initializable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    IUniSwapV2Router02 router;
    IERC20 usdc;
    IERC20Upgradeable token;
    mapping(uint => bool) mintedToken;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant EXECUTER_ROLE = keccak256("EXECUTER_ROLE");

    // 00 horas del 30 de septiembre del 2023 GMT
    uint256 constant startDate = 1696032000;

    // Maximo price NFT
    uint256 constant MAX_PRICE_NFT = 90_000 * 10 ** 18;

    event PurchaseNftWithId(address account, uint256 id);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        IUniSwapV2Router02 _router,
        IERC20 usdc,
        IERC20Upgradeable _token
    ) initializer public {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        router = _router;
        token = _token;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function purchaseWithTokens(uint256 _id) public {
        require(_id >= 0 && _id <= 699, "Compra no disponible");
        require(!mintedToken[_id], "Id no disponible");
        uint price = getPriceForId(_id);
        token.transfer(address(this), price * 10 ** token.decimals());
        mintedToken[_id] = true;
        emit PurchaseNftWithId(msg.sender, _id);
    }

    function getPriceForId(uint _id) public view returns (uint) {
        if(_id >= 0 && _id <= 199) {
            return 1000;
        } else if (_id >= 200 && _id <= 499) {
            return _id * 20;
        } else if (_id >= 500 && _id <= 699) {
            uint priceCalculated = 10_000 + 2_000 * (block.timestamp - startDate) / 60 / 60 / 24;
            if(priceCalculated > MAX_PRICE_NFT) {
                return MAX_PRICE_NFT;
            }
            return priceCalculated;
        }
    }

    function purchaseWithUSDC(uint256 _id, uint256 _amountIn) external {
        require(_id >= 0 && _id <= 699, "Compra no disponible");
        require(!mintedToken[_id], "Id no disponible");
        usdc.approve(address(router), _amountIn)
        uint[] memory _amounts = router.swapTokensForExactTokens(
            getPriceForId(_id),
            _amountIn,
            [address(usdc), address(token)],
            address(this),
            deadline
        );
        token.transfer(address(this), _amounts[0] * price * 10 ** token.decimals());
        usdc.trasfer(msg.sender, _amounts[1]);
        // transfiere _amountIn de USDC a este contrato
        // llama a swapTokensForExactTokens: valor de retorno de este metodo es cuanto gastaste del token input
        // transfiere el excedente de USDC a msg.sender

        emit PurchaseNftWithId(msg.sender, _id);
    }

    function purchaseWithEtherAndId(uint256 _id) public payable {
        require(_id >= 700 && _id <= 999, "Compra no disponible");
        require(!mintedToken[_id], "Id no disponible");
        if (msg.value > 0.01 ether) {
            payable(msg.sender).transfer(msg.value - 0.01 ether);
        }
        emit PurchaseNftWithId(msg.sender, _id);
    }

    function depositEthForARandomNft() public payable {
        require(msg.value == 0.01 ether, "Monto incorrecto");
        //TODO: Como saber que esta disponible
        uint _id = getRandomNumber();
        require(!mintedToken[_id], "Id no disponible");
        emit PurchaseNftWithId(msg.sender, _id);
    }

    function getRandomNumber() public returns(uint) {
        uint number = uint256(
            keccak256(
                abi.encodePacked(
                    msg.sender,
                    blockhash(block.number - 1),
                    block.timestamp
                )
            )
        ) % 300 + 700;
        return number;
    }

    receive() external payable {
        depositEthForARandomNft();
    }

    function updateTokenAddress(address _tokenAddress) public onlyRole(DEFAULT_ADMIN_ROLE){
        tokenAddress = _tokenAddress;
    }

    ////////////////////////////////////////////////////////////////////////
    /////////                    Helper Methods                    /////////
    ////////////////////////////////////////////////////////////////////////

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}
}
