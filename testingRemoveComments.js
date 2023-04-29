contract MEMEKONG is IERC20, TokenEvents {
    using SafeMath
    for uint256;
    using SafeMath
    for uint64;
    using SafeMath
    for uint32;
    using SafeMath
    for uint16;
    using SafeMath
    for uint8;

    using SafeERC20
    for MEMEKONG;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    address public uniPool;


    uint256 public burnAdjust = 10;
    uint256 public poolBurnAdjust = 100;

    uint constant internal MINUTESECONDS = 60;
    uint constant internal DAYSECONDS = 86400;
    uint constant internal MINSTAKEDAYLENGTH = 9;
    uint256 public totalStaked;

    uint256 internal _totalSupply;
    string public constant name = "MEME KONG";
    string public constant symbol = "MKONG";
    uint8 public constant decimals = 9;


    address constant internal _P1 = 0x4556a3bF9633aAcB73039004364A73a437606dE1;
    address constant internal _P2 = 0x8CBCA3836E2e99DB797793E42328D48eEA665D4b;
    bool public isLocked = false;
    bool private sync;

    mapping(address => bool) admins;
    mapping(address => Staker) public staker;

    struct Staker {
        uint256 stakedBalance;
        uint256 stakeStartTimestamp;
        uint256 totalStakingInterest;
        uint256 totalBurnt;
        bool activeUser;
    }

    modifier onlyAdmins() {
        require(admins[msg.sender], "not an admin");
        _;
    }


    modifier synchronized {
        require(!sync, "Sync lock");
        sync = true;
        _;
        sync = false;
    }

    constructor(uint256 initialTokens) {
        admins[_P1] = true;
        admins[msg.sender] = true;

        mintInitialTokens(initialTokens);
    }

    function totalSupply() external view override returns(uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns(uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) external override returns(bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) external view override returns(uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns(bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns(bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) external returns(bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].add(addedValue));
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external returns(bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        _balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal {
        uint256 amt = amount;
        require(account != address(0), "ERC20: mint to the zero address");
        _totalSupply = _totalSupply.add(amt);
        _balances[account] = _balances[account].add(amt);
        emit Transfer(address(0), account, amt);
    }

    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from the zero address");
        _balances[account] = _balances[account].sub(amount, "ERC20: burn amount exceeds balance");
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _burnFrom(address account, uint256 amount) internal {
        _burn(account, amount);
        _approve(account, msg.sender, _allowances[account][msg.sender].sub(amount, "ERC20: burn amount exceeds allowance"));
    }

    function mintInitialTokens(uint amount)
    internal
    synchronized {
        _mint(_P1, amount);
    }

    function StakeTokens(uint amt)
    external
    synchronized {
        require(amt > 0, "zero input");
        require(mkongBalance() >= amt, "Error: insufficient balance");

        claimInterest();

        staker[msg.sender].activeUser = true;
        staker[msg.sender].stakedBalance = staker[msg.sender].stakedBalance.add(amt);
        totalStaked = totalStaked.add(amt);
        _transfer(msg.sender, address(this), amt);
        emit TokenStake(msg.sender, amt);
    }

    function UnstakeTokens()
    external
    synchronized {
        require(staker[msg.sender].stakedBalance > 0, "Error: unsufficient frozen balance");
        require(isStakeFinished(msg.sender), "tokens cannot be unstaked yet. min 9 day stake");
        uint amt = staker[msg.sender].stakedBalance;

        claimInterest();

        staker[msg.sender].stakeStartTimestamp = 0;
        staker[msg.sender].stakedBalance = 0;
        totalStaked = totalStaked.sub(amt);
        _transfer(address(this), msg.sender, amt);
        emit TokenUnstake(msg.sender, amt);
    }

    function ClaimStakeInterest()
    external
    synchronized {
        require(staker[msg.sender].stakedBalance > 0, "you have no staked balance");
        claimInterest();
    }

    function RollStakeInterest()
    external
    synchronized {
        require(staker[msg.sender].stakedBalance > 0, "you have no staked balance");
        rollInterest();
    }

    function rollInterest()
    internal {
        uint256 interest = calcStakingRewards(msg.sender);

        if (interest > 0) {
            _mint(address(this), interest);

            staker[msg.sender].stakedBalance = staker[msg.sender].stakedBalance.add(interest);
            totalStaked = totalStaked.add(interest);
            staker[msg.sender].totalStakingInterest += interest;

            staker[msg.sender].stakeStartTimestamp = block.timestamp;
            _mint(_P1, interest.mul(7).div(100));
            _mint(_P2, interest.mul(2).div(100));
        }
    }

    function claimInterest()
    internal {

        uint256 interest = calcStakingRewards(msg.sender);

        staker[msg.sender].stakeStartTimestamp = block.timestamp;

        if (interest > 0) {
            _mint(msg.sender, interest);
            staker[msg.sender].totalStakingInterest += interest;
            _mint(_P1, interest.mul(7).div(100));
            _mint(_P2, interest.mul(2).div(100));
        }
    }

    function BurnMkong(uint amt)
    external
    synchronized {
        require(staker[msg.sender].totalBurnt.add(amt) <= staker[msg.sender].totalStakingInterest.mul(burnAdjust), "can only burn equivalent of x10 total staking interest");
        require(amt > 0, "value must be greater than 0");
        require(balanceOf(msg.sender) >= amt, "balance too low");

        _burn(msg.sender, amt);
        staker[msg.sender].totalBurnt += amt;

        uint256 poolDiv = _balances[uniPool].div(poolBurnAdjust);
        if (poolDiv > amt) {
            _balances[uniPool] = _balances[uniPool].sub(amt, "ERC20: burn amount exceeds balance");
            _totalSupply = _totalSupply.sub(amt);
            emit TokenBurn(msg.sender, amt);
        } else {
            _balances[uniPool] = _balances[uniPool].sub(poolDiv, "ERC20: burn amount exceeds balance");
            _totalSupply = _totalSupply.sub(poolDiv);
            emit TokenBurn(msg.sender, poolDiv);
        }
        IUniswapV2Pair(uniPool).sync();

        emit TokenBurn(msg.sender, amt);
    }

    function calcStakingRewards(address _user)
    public
    view
    returns(uint) {
        uint mkongBurnt = staker[_user].totalBurnt;
        uint staked = staker[_user].stakedBalance;

        uint apyAdjust = 10000;
        if (mkongBurnt > 0) {
            if (mkongBurnt >= staked.sub(staked.div(10))) {

                apyAdjust = 1000;
            } else {
                uint burntPercentage = ((mkongBurnt.mul(100) / staked));
                uint v = (apyAdjust * burntPercentage) / 100;
                apyAdjust = apyAdjust.sub(v);
                if (apyAdjust < 1000) {
                    apyAdjust = 1000;
                }
            }
        }
        return (staked.mul(minsPastStakeTime(_user)).div(apyAdjust).div(1314));
    }

    function minsPastStakeTime(address _user)
    public
    view
    returns(uint) {
        if (staker[_user].stakeStartTimestamp == 0) {
            return 0;
        }
        uint minsPast = (block.timestamp).sub(staker[_user].stakeStartTimestamp).div(MINUTESECONDS);
        if (minsPast >= 1) {
            return minsPast;
        } else {
            return 0;
        }
    }

    function isStakeFinished(address _user)
    public
    view
    returns(bool) {
        if (staker[_user].stakeStartTimestamp == 0) {
            return false;
        } else {
            return staker[_user].stakeStartTimestamp.add((DAYSECONDS).mul(MINSTAKEDAYLENGTH)) <= block.timestamp;
        }
    }

    function mkongBalance()
    public
    view
    returns(uint256) {
        return balanceOf(msg.sender);
    }

    function setUnipool(address _lpAddress)
    external
    onlyAdmins {
        require(!isLocked, "cannot change native pool");
        uniPool = _lpAddress;
    }

    function setBurnAdjust(uint _v)
    external
    onlyAdmins {
        require(!isLocked, "cannot change burn rate");
        burnAdjust = _v;
    }

    function uniPoolBurnAdjust(uint _v)
    external
    onlyAdmins {
        require(!isLocked, "cannot change pool burn rate");
        poolBurnAdjust = _v;
    }

    function revokeAdmin()
    external
    onlyAdmins {
        isLocked = true;
    }
}