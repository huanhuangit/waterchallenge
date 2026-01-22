class WaterPouringGame {
    constructor() {
        // 游戏状态
        this.currentWaterLevel = 0;
        this.targetWaterLevel = 0;
        this.isPouring = false;
        this.round = 1;
        this.attempts = 0; // 当前关卡尝试次数
        this.maxAttempts = 3; // 每关最多尝试次数
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('waterGameHighScore') || '0');
        this.pourSpeed = 0.3; // 初始水流速度
        this.allowedError = 5; // 初始允许误差5%
        this.gameEnded = false;
        this.gameOver = false; // 游戏结束标志

        // DOM 元素
        this.water = document.getElementById('water');
        this.waterStream = document.getElementById('waterStream');
        this.targetLine = document.getElementById('targetLine');
        this.targetPercent = document.getElementById('targetPercent');
        this.pourButton = document.getElementById('pourButton');
        this.confirmBtn = document.getElementById('confirmBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.resultModal = document.getElementById('resultModal');
        this.nextBtn = document.getElementById('nextBtn');
        this.roundDisplay = document.getElementById('round');
        this.scoreDisplay = document.getElementById('score');
        this.highScoreDisplay = document.getElementById('highScore');

        // 结果弹窗元素
        this.resultIcon = document.getElementById('resultIcon');
        this.resultTitle = document.getElementById('resultTitle');
        this.resultTarget = document.getElementById('resultTarget');
        this.resultActual = document.getElementById('resultActual');
        this.resultError = document.getElementById('resultError');
        this.resultScore = document.getElementById('resultScore');

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateHighScoreDisplay();
        this.startNewRound();
    }

    bindEvents() {
        // 倒水按钮 - 鼠标事件
        this.pourButton.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startPouring();
        });
        this.pourButton.addEventListener('mouseup', () => this.stopPouring());
        this.pourButton.addEventListener('mouseleave', () => this.stopPouring());

        // 倒水按钮 - 触摸事件
        this.pourButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startPouring();
        });
        this.pourButton.addEventListener('touchend', () => this.stopPouring());
        this.pourButton.addEventListener('touchcancel', () => this.stopPouring());

        // 确认按钮
        this.confirmBtn.addEventListener('click', () => this.confirmWaterLevel());

        // 重置按钮
        this.resetBtn.addEventListener('click', () => this.resetGame());

        // 下一关按钮
        this.nextBtn.addEventListener('click', () => this.handleNextAction());

        // 弹窗内重新开始按钮
        document.getElementById('restartBtn').addEventListener('click', () => this.resetGame());

        // 键盘支持 - 空格键倒水
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.gameEnded) {
                e.preventDefault();
                this.startPouring();
            }
        });
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.stopPouring();
            }
        });
    }

    // 根据关卡计算允许误差（从5%逐渐减小到1%）
    calculateAllowedError() {
        // 第1关: 5%, 第2关: 4.5%, 第3关: 4%, ... 最小1%
        const error = 5 - (this.round - 1) * 0.5;
        return Math.max(error, 1);
    }

    // 根据关卡计算水流速度（从0.3逐渐增加到0.8）
    calculatePourSpeed() {
        // 第1关: 0.3, 第2关: 0.35, 第3关: 0.4, ... 最大0.8
        const speed = 0.3 + (this.round - 1) * 0.05;
        return Math.min(speed, 0.8);
    }

    startNewRound() {
        // 生成随机目标水位 (20% - 90%)
        this.targetWaterLevel = Math.floor(Math.random() * 71) + 20;
        this.currentWaterLevel = 0;
        this.gameEnded = false;
        this.attempts = 0;

        // 根据关卡更新难度
        this.allowedError = this.calculateAllowedError();
        this.pourSpeed = this.calculatePourSpeed();

        // 更新 UI
        this.updateWaterDisplay();
        this.updateTargetDisplay();
        this.updateRoundDisplay();

        // 启用确认按钮
        this.confirmBtn.disabled = true;
    }

    // 重试当前关卡（只重置水位，不重置目标）
    retryCurrentRound() {
        this.currentWaterLevel = 0;
        this.gameEnded = false;

        // 更新 UI
        this.updateWaterDisplay();

        // 禁用确认按钮
        this.confirmBtn.disabled = true;
    }

    startPouring() {
        if (this.isPouring || this.gameEnded) return;

        this.isPouring = true;
        this.pourButton.classList.add('pouring');
        this.waterStream.style.height = '155px'; // 水流到杯子
        this.confirmBtn.disabled = false;

        this.pourInterval = requestAnimationFrame(() => this.pour());
    }

    stopPouring() {
        if (!this.isPouring) return;

        this.isPouring = false;
        this.pourButton.classList.remove('pouring');
        this.waterStream.style.height = '0';

        if (this.pourInterval) {
            cancelAnimationFrame(this.pourInterval);
        }
    }

    pour() {
        if (!this.isPouring || this.gameEnded) return;

        // 增加水位
        this.currentWaterLevel += this.pourSpeed;

        // 限制最大水位
        if (this.currentWaterLevel >= 100) {
            this.currentWaterLevel = 100;
            this.stopPouring();
        }

        this.updateWaterDisplay();

        if (this.isPouring) {
            this.pourInterval = requestAnimationFrame(() => this.pour());
        }
    }

    updateWaterDisplay() {
        this.water.style.height = `${this.currentWaterLevel}%`;
    }

    updateTargetDisplay() {
        this.targetPercent.textContent = `${this.targetWaterLevel}% (±${this.allowedError.toFixed(1)}%)`;
        // 设置目标线位置
        this.targetLine.style.bottom = `${this.targetWaterLevel}%`;
    }

    updateRoundDisplay() {
        this.roundDisplay.textContent = this.round;
        this.scoreDisplay.textContent = this.score;
    }

    updateHighScoreDisplay() {
        this.highScoreDisplay.textContent = this.highScore;
    }

    confirmWaterLevel() {
        if (this.gameEnded) return;

        this.gameEnded = true;
        this.stopPouring();
        this.attempts++;

        const error = Math.abs(this.currentWaterLevel - this.targetWaterLevel);
        const roundedError = Math.round(error * 10) / 10;
        const isSuccess = error <= this.allowedError;

        // 计算得分
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
            localStorage.setItem('waterGameHighScore', this.highScore.toString());
            this.updateHighScoreDisplay();
        }

        // 判断是否游戏结束
        if (!isSuccess && this.attempts >= this.maxAttempts) {
            this.gameOver = true;
        }

        // 显示结果
        this.showResult(isSuccess, roundedError, scoreChange);
    }

    showResult(isSuccess, error, scoreChange) {
        if (this.gameOver) {
            // 游戏结束
            this.resultIcon.textContent = '💔';
            this.resultTitle.textContent = '游戏结束！';
            this.resultTitle.className = 'result-title fail';
            this.nextBtn.textContent = '重新开始';
        } else if (isSuccess) {
            this.resultIcon.textContent = '🎉';
            this.resultTitle.textContent = '太棒了！';
            this.resultTitle.className = 'result-title success';
            this.nextBtn.textContent = '下一关';
        } else {
            this.resultIcon.textContent = '😢';
            this.resultTitle.textContent = `还有${this.maxAttempts - this.attempts}次机会`;
            this.resultTitle.className = 'result-title fail';
            this.nextBtn.textContent = '再试一次';
        }

        this.resultTarget.textContent = `${this.targetWaterLevel}%`;
        this.resultActual.textContent = `${Math.round(this.currentWaterLevel)}%`;
        this.resultError.textContent = `${error.toFixed(1)}% (允许: ±${this.allowedError.toFixed(1)}%)`;
        this.resultError.style.color = isSuccess ? '#5dff64' : '#ff6b6b';

        if (isSuccess) {
            this.resultScore.textContent = `+${scoreChange}分`;
            this.resultScore.className = 'result-score';
        } else {
            this.resultScore.textContent = '未得分';
            this.resultScore.className = 'result-score negative';
        }

        // 显示弹窗
        this.resultModal.classList.add('show');
    }

    handleNextAction() {
        this.resultModal.classList.remove('show');

        if (this.gameOver) {
            // 游戏结束，完全重置
            this.resetGame();
            return;
        }

        const error = Math.abs(this.currentWaterLevel - this.targetWaterLevel);
        const isSuccess = error <= this.allowedError;

        if (isSuccess) {
            // 成功，进入下一关
            this.round++;
            this.startNewRound();
        } else {
            // 失败但还有机会，重试当前关卡
            this.retryCurrentRound();
        }
    }

    resetGame() {
        this.resultModal.classList.remove('show');
        this.round = 1;
        this.score = 0;
        this.attempts = 0;
        this.gameOver = false;
        this.pourSpeed = 0.3;
        this.allowedError = 5;
        this.startNewRound();
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    new WaterPouringGame();
});
