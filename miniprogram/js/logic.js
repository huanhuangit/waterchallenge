/**
 * 游戏逻辑核心类
 * 负责状态管理、分数计算、最高分存储等，不包含任何UI渲染代码
 */
export default class GameLogic {
    constructor() {
        this.currentWaterLevel = 0;
        this.targetWaterLevel = 0;
        this.isPouring = false;
        this.round = 1;
        this.attempts = 0;
        this.maxAttempts = 3;
        this.score = 0;
        this.highScore = 0;
        this.highScoreTime = '';
        this.pourSpeed = 0.3;
        this.allowedError = 3;
        this.gameEnded = false;
        this.gameOver = false;
        this.newRecordAchieved = false;

        // 倒计时相关
        this.maxPourTime = 5000; // 5秒 (毫秒)
        this.remainingPourTime = this.maxPourTime; // 剩余时间
        this.lastUpdateTime = 0; // 上次更新时间
        this.timeExpired = false; // 时间是否已用完

        this.initHighScore();
    }

    initHighScore() {
        try {
            const score = wx.getStorageSync('waterGameHighScore');
            const time = wx.getStorageSync('waterGameHighScoreTime');
            this.highScore = score ? parseInt(score) : 0;
            this.highScoreTime = time || '';
        } catch (e) {
            this.highScore = 0;
        }
    }

    // 根据关卡计算允许误差
    calculateAllowedError() {
        // 分段难度递减：
        // 1-5关: 每关减少0.5% (从3%开始)
        // 6-10关: 每关减少0.2%
        // 11关以后: 固定0.1%

        if (this.round <= 5) {
            // 第1关: 3%, 第2关: 2.5%, 第3关: 2%, 第4关: 1.5%, 第5关: 1%
            const error = 3 - (this.round - 1) * 0.5;
            return error;
        } else if (this.round <= 10) {
            // 第6关: 0.8%, 第7关: 0.6%, 第8关: 0.4%, 第9关: 0.2%, 第10关: 0.1% (到达最小值)
            const error = 1 - (this.round - 5) * 0.2;
            return Math.max(error, 0.1);
        } else {
            // 第11关及以后: 固定0.1%
            return 0.1;
        }
    }

    // 根据关卡计算水流速度（固定递增）
    calculatePourSpeed() {
        // 按关卡分段递增水流速度
        // 1-5关: 0.5 -> 0.7 (每关+0.05)
        // 6-10关: 0.8 -> 1.0 (每关+0.05)
        // 11-15关: 1.1 -> 1.3 (每关+0.05)
        // 16+关: 1.4+ (每关+0.05)

        let speed;
        if (this.round <= 5) {
            // 第1关: 0.5, 第5关: 0.7
            speed = 0.5 + (this.round - 1) * 0.05;
        } else if (this.round <= 10) {
            // 第6关: 0.8, 第10关: 1.0
            speed = 0.8 + (this.round - 6) * 0.05;
        } else if (this.round <= 15) {
            // 第11关: 1.1, 第15关: 1.3
            speed = 1.1 + (this.round - 11) * 0.05;
        } else {
            // 第16关+: 1.4+
            speed = 1.4 + (this.round - 16) * 0.05;
        }

        // 限制最大速度为2.5
        return Math.min(speed, 2.5);
    }

    // 根据目标水位动态计算倒计时时长
    calculateMaxPourTime() {
        // 动态计算，确保在倒计时内能达到目标水位
        // 公式：time = targetLevel / pourSpeed * safetyFactor
        // safetyFactor 给玩家留出控制时间

        // 先计算当前关卡的速度
        const speed = this.calculatePourSpeed();

        // 计算达到目标水位所需的时间（秒）
        const baseTimeSeconds = this.targetWaterLevel / speed;

        // 使用1.3的安全系数，给玩家额外30%的控制时间
        const safeTimeSeconds = baseTimeSeconds * 1.3;

        // 转换为毫秒，向上取整到100ms
        const timeMs = Math.ceil(safeTimeSeconds * 10) * 100;

        // 设置最小和最大值
        // 最小1秒，最大5秒
        return Math.max(1000, Math.min(timeMs, 5000));
    }

    startNewRound() {
        // 生成随机目标水位 (20% - 90%)
        this.targetWaterLevel = Math.floor(Math.random() * 71) + 20;
        this.currentWaterLevel = 0;
        this.gameEnded = false;
        this.attempts = 0;
        this.newRecordAchieved = false;
        this.timeExpired = false;

        this.allowedError = this.calculateAllowedError();
        // 先计算速度（基于关卡），再计算倒计时（基于目标水位和速度）
        this.pourSpeed = this.calculatePourSpeed();
        this.maxPourTime = this.calculateMaxPourTime();
        this.remainingPourTime = this.maxPourTime;

        // 开始计时
        this.lastUpdateTime = Date.now();
    }

    retryCurrentRound() {
        this.currentWaterLevel = 0;
        this.gameEnded = false;
        this.remainingPourTime = this.maxPourTime;
        this.timeExpired = false;

        // 重新开始计时
        this.lastUpdateTime = Date.now();
    }

    startPouring() {
        if (this.isPouring || this.gameEnded || this.timeExpired) return;
        this.isPouring = true;
    }

    stopPouring() {
        if (!this.isPouring) return;
        this.isPouring = false;
    }

    update() {
        // 倒计时始终运行，直到游戏结束或时间用完
        if (this.gameEnded) return false;

        // 更新倒计时
        const now = Date.now();
        const deltaTime = now - this.lastUpdateTime;
        this.lastUpdateTime = now;
        this.remainingPourTime -= deltaTime;

        // 倒计时结束
        if (this.remainingPourTime <= 0) {
            this.remainingPourTime = 0;
            this.timeExpired = true;
            this.stopPouring();
            return true;
        }

        // 只有在倒水时才增加水位
        if (this.isPouring) {
            this.currentWaterLevel += this.pourSpeed;

            if (this.currentWaterLevel >= 100) {
                this.currentWaterLevel = 100;
                this.stopPouring();
            }
        }

        return true; // State changed
    }

    confirmWaterLevel() {
        if (this.gameEnded) return null;

        this.gameEnded = true;
        this.stopPouring();
        this.attempts++;

        const error = Math.abs(this.currentWaterLevel - this.targetWaterLevel);
        const roundedError = Math.round(error * 10) / 10;
        const isSuccess = error <= this.allowedError;
        let scoreChange = 0;

        if (isSuccess) {
            // 误差越小，得分越高；关卡越高，基础分越高
            const baseScore = 50 + this.round * 10;
            scoreChange = Math.round(baseScore + (this.allowedError - error) * 10);
            this.score += scoreChange;
        }

        // 更新最高分
        if (this.score > this.highScore) {
            this.highScore = this.score;
            const now = new Date();
            this.highScoreTime = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            try {
                wx.setStorageSync('waterGameHighScore', this.highScore.toString());
                wx.setStorageSync('waterGameHighScoreTime', this.highScoreTime);
            } catch (e) {
                console.error(e);
            }

            this.newRecordAchieved = true;
        }

        // 判断游戏结束
        if (!isSuccess && this.attempts >= this.maxAttempts) {
            this.gameOver = true;
        }

        return {
            isSuccess,
            error: roundedError,
            scoreChange
        };
    }

    handleNextAction(prevResult) {
        if (this.gameOver) {
            this.resetGame();
            return 'reset';
        }

        if (prevResult && prevResult.isSuccess) {
            this.round++;
            this.startNewRound();
            return 'next';
        } else {
            this.retryCurrentRound();
            return 'retry';
        }
    }

    resetGame() {
        this.round = 1;
        this.score = 0;
        this.attempts = 0;
        this.gameOver = false;
        this.pourSpeed = 0.3;
        this.allowedError = 5;
        this.startNewRound();
    }

    clearHighScore() {
        this.highScore = 0;
        this.highScoreTime = '';
        try {
            wx.removeStorageSync('waterGameHighScore');
            wx.removeStorageSync('waterGameHighScoreTime');
        } catch (e) {
            console.error(e);
        }
    }
}
