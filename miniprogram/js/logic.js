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
        this.allowedError = 5;
        this.gameEnded = false;
        this.gameOver = false;
        this.newRecordAchieved = false;

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
        // 第1关: 5%, 第2关: 4.5%, ... 最小1%
        const error = 5 - (this.round - 1) * 0.5;
        return Math.max(error, 1);
    }

    // 根据关卡计算水流速度
    calculatePourSpeed() {
        // 第1关: 0.3, 第2关: 0.35, ... 最大0.8
        const speed = 0.3 + (this.round - 1) * 0.05;
        return Math.min(speed, 0.8);
    }

    startNewRound() {
        // 生成随机目标水位 (20% - 90%)
        this.targetWaterLevel = Math.floor(Math.random() * 71) + 20;
        this.currentWaterLevel = 0;
        this.gameEnded = false;
        this.attempts = 0;
        this.newRecordAchieved = false;

        this.allowedError = this.calculateAllowedError();
        this.pourSpeed = this.calculatePourSpeed();
    }

    retryCurrentRound() {
        this.currentWaterLevel = 0;
        this.gameEnded = false;
    }

    startPouring() {
        if (this.isPouring || this.gameEnded) return;
        this.isPouring = true;
    }

    stopPouring() {
        if (!this.isPouring) return;
        this.isPouring = false;
    }

    update() {
        if (!this.isPouring || this.gameEnded) return false;

        this.currentWaterLevel += this.pourSpeed;

        if (this.currentWaterLevel >= 100) {
            this.currentWaterLevel = 100;
            this.stopPouring();
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
