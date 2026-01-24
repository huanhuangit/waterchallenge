import GameLogic from './logic.js'
import Renderer from './renderer.js'

export default class Main {
    constructor() {
        this.game = new GameLogic();
        this.renderer = new Renderer();

        this.hasResult = false; // 是否正在显示结果
        this.lastResult = null; // 这一轮的结果数据

        this.start();
        this.bindEvents();
    }

    start() {
        this.game.startNewRound();
        this.loop();
    }

    loop() {
        this.update();
        this.render();

        this.aniId = requestAnimationFrame(this.loop.bind(this));
    }

    update() {
        // 逻辑更新
        this.game.update();
    }

    render() {
        this.renderer.render(this.game);

        // 如果有结果，在这里画覆盖层
        if (this.hasResult) {
            this.renderer.drawResultModal(
                this.renderer.ctx,
                this.renderer.width,
                this.renderer.height,
                this.lastResult,
                this.game
            );
        }
    }

    bindEvents() {
        wx.onTouchStart((e) => {
            const touch = e.touches[0];
            const x = touch.clientX * this.renderer.dpr; // 转换为 Canvas 坐标 (如果 Canvas 缩放过)
            // 注意：微信小游戏 touch 事件坐标通常是屏幕物理像素还是逻辑像素，取决于 canvas 的宽高设置
            // 这里简化处理，假设全屏且使用逻辑坐标
            this.handleInputStart(touch.clientX, touch.clientY);
        });

        wx.onTouchEnd((e) => {
            this.handleInputEnd();
        });
    }

    handleInputStart(x, y) {
        // 简单的点击区域检测 (需要根据 renderer 中的坐标进行匹配)
        // 这里只是做演示，实际项目需要更精确的 HitTest

        const r = this.renderer;
        const dpr = r.dpr || 1;
        // 转换为 canvas 内部坐标系
        const cx = x * dpr;
        const cy = y * dpr;

        if (this.hasResult) {
            // 点击弹窗按钮
            if (this.isInRect(cx, cy, r.modalBtnArea)) {
                const action = this.game.handleNextAction(this.lastResult);
                this.hasResult = false;
                this.lastResult = null;
            }
            return;
        }

        // 倒水按钮
        if (this.isInCircle(cx, cy, r.pourBtnArea)) {
            this.game.startPouring();
        }

        // 确认按钮
        if (this.isInRect(cx, cy, r.confirmBtnArea)) {
            const result = this.game.confirmWaterLevel();
            if (result) {
                this.hasResult = true;
                this.lastResult = result;
            }
        }

        // 重置按钮
        if (this.isInRect(cx, cy, r.resetBtnArea)) {
            this.game.resetGame();
        }
    }

    handleInputEnd() {
        this.game.stopPouring();
    }

    isInCircle(x, y, circle) {
        if (!circle) return false;
        const dx = x - circle.x;
        const dy = y - circle.y;
        return dx * dx + dy * dy <= circle.r * circle.r;
    }

    isInRect(x, y, rect) {
        if (!rect) return false;
        // rect: {x, y, w, h} 中心点 x,y
        const left = rect.x - rect.w / 2;
        const right = rect.x + rect.w / 2;
        const top = rect.y - rect.h / 2;
        const bottom = rect.y + rect.h / 2;

        return x >= left && x <= right && y >= top && y <= bottom;
    }
}
