/**
 * 负责 Canvas 渲染
 * 重构版本：采用 Flex 布局思想，严格分区，防止重叠
 */
export default class Renderer {
    constructor() {
        this.canvas = wx.createCanvas();
        this.ctx = this.canvas.getContext('2d');

        // 获取系统信息，用于处理 DPI
        const systemInfo = wx.getSystemInfoSync();
        this.dpr = systemInfo.pixelRatio;
        this.windowWidth = systemInfo.windowWidth;
        this.windowHeight = systemInfo.windowHeight;

        // 在微信小游戏中，canvas.width/height 通常已经被设置为 physical pixels
        // 我们在渲染时统一使用逻辑像素进行计算，缩放 ctx 即可
        // 或者都在 draw 时乘 dpr。为了清晰，我们使用逻辑像素 (Logical Pixels) 概念

        // 修正 Canvas 尺寸 (Web Preview 中可能需要手动调整，真机一般自动)
        if (this.canvas.width !== this.windowWidth * this.dpr) {
            this.canvas.width = this.windowWidth * this.dpr;
            this.canvas.height = this.windowHeight * this.dpr;
        }

        this.width = this.canvas.width;  // 物理像素宽
        this.height = this.canvas.height; // 物理像素高
    }

    // 逻辑像素转物理像素 (所有绘图坐标都经过这个转换)
    p(v) {
        return v * this.dpr;
    }

    render(gameModel) {
        const ctx = this.ctx;
        const w = this.width; // 物理宽
        const h = this.height; // 物理高

        // 逻辑宽高
        const logicW = w / this.dpr;
        const logicH = h / this.dpr;

        // 清空
        ctx.clearRect(0, 0, w, h);

        // 1. 全局背景
        this.drawBackground(ctx, w, h);

        // --- 布局系统 (基于逻辑像素) ---
        // 我们将屏幕垂直划分为几个区域
        // 1. Top Area: 标题 + 状态栏 + 目标指示
        // 2. Bottom Area: 控制按钮
        // 3. Middle Area: 游戏互动区 (自动填充剩余空间)

        const topPadding = 20 + 44 + 40; // 状态栏 + 顶部留白 + 额外空间
        const bottomPadding = 80; // Home Indicator + 额外底部空间
        const sidePadding = 20;

        // --- 顶部区域计算 ---
        const headerH = 60;
        const statsH = 70;
        const targetH = 80;
        const topAreaH = headerH + statsH + targetH;

        // --- 底部区域计算 ---
        const controlsH = 160;

        // --- 中间游戏区域 ---
        const middleY = topPadding + topAreaH;
        // 剩余高度 = 总高度 - 顶部起始 - 底部区域 - 底部安全区
        const availableMiddleH = logicH - middleY - controlsH - bottomPadding;

        // 渲染坐标原点偏移 (用于卡片效果)
        // 这里的策略是：内容居中显示在卡片内，卡片有最大宽度
        const maxCardW = 400;
        const cardW = Math.min(logicW - sidePadding * 2, maxCardW);
        const cardX = (logicW - cardW) / 2;

        // 为了视觉平衡，卡片高度设为内容总高度，或者撑满屏幕
        // 这里采用撑满屏幕（留边距），内部元素相对布局
        const cardY = topPadding;
        const cardH = logicH - topPadding - bottomPadding; // 简单起见，卡片占满垂直安全区

        // 绘制卡片背景
        this.drawCard(ctx, this.p(cardX), this.p(cardY), this.p(cardW), this.p(cardH));

        // 记录控制区位置供点击检测 (逻辑坐标转物理坐标存储)
        this.layout = {
            controlsY: cardY + cardH - controlsH,
            centerX: logicW / 2
        };

        // --- 开始绘制各部分 (传入逻辑坐标，内部转物理坐标) ---

        // 1. Header
        this.drawHeader(ctx, logicW / 2, cardY + 30);

        // 2. Stats
        this.drawStats(ctx, logicW / 2, cardY + headerH, cardW - 40, gameModel);

        // 3. Target
        this.drawTargetDisplay(ctx, logicW / 2, cardY + headerH + statsH + 10, cardW - 40, gameModel);

        // 4. Game Area (重点：自动适应中间区域)
        this.drawGameArea(ctx, logicW / 2, middleY, availableMiddleH, gameModel);

        // 5. Controls
        this.drawControls(ctx, logicW / 2, this.layout.controlsY, controlsH, gameModel);

        // 6. 结果弹窗 (居中覆盖)
        if (gameModel.gameEnded) {
            // Main loop handles logic, we verify if specific rendering needed here
        }
    }

    drawBackground(ctx, w, h) {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(0.5, '#16213e');
        grad.addColorStop(1, '#0f3460');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    drawCard(ctx, x, y, w, h) {
        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        const r = this.p(24);
        this.roundRect(ctx, 0, 0, w, h, r);
        ctx.fill();
        ctx.stroke();

        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = this.p(30);
        ctx.shadowOffsetY = this.p(20);

        ctx.restore();
    }

    drawHeader(ctx, lcx, ly) {
        const cx = this.p(lcx);
        const y = this.p(ly);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `bold ${this.p(24)}px sans-serif`;
        ctx.shadowColor = 'rgba(100, 200, 255, 0.5)';
        ctx.shadowBlur = this.p(15);
        ctx.fillText('💧 接水大挑战', cx, y);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = `${this.p(12)}px sans-serif`;
        ctx.fillText('控制水位，挑战精准度！', cx, y + this.p(35));
    }

    drawStats(ctx, lcx, ly, lw, model) {
        const cx = this.p(lcx);
        const y = this.p(ly);
        const w = this.p(lw);
        const h = this.p(70);
        const x = cx - w / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        this.roundRect(ctx, x, y, w, h, this.p(12));
        ctx.fill();

        const itemW = w / 3;
        const fontLabel = this.p(11);
        const fontVal = this.p(20);
        const fontSub = this.p(9);

        const drawItem = (label, value, idx, subText = null) => {
            const ix = x + itemW * idx + itemW / 2;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = `${fontLabel}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(label, ix, y + this.p(12));

            ctx.fillStyle = '#64d2ff';
            ctx.font = `bold ${fontVal}px sans-serif`;
            ctx.fillText(value, ix, y + this.p(30));

            if (subText) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.font = `${fontSub}px sans-serif`;
                ctx.fillText(subText, ix, y + this.p(52));
            }
        };

        drawItem('回合', model.round, 0);
        drawItem('得分', model.score, 1);
        drawItem('最高分', model.highScore, 2, model.highScoreTime);

        ctx.restore();
    }

    drawTargetDisplay(ctx, lcx, ly, lw, model) {
        const cx = this.p(lcx);
        const y = this.p(ly);
        const w = this.p(lw);
        const h = this.p(80);
        const x = cx - w / 2;

        ctx.save();
        const grad = ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, 'rgba(100, 210, 255, 0.2)');
        grad.addColorStop(1, 'rgba(100, 150, 255, 0.1)');
        ctx.fillStyle = grad;
        ctx.strokeStyle = 'rgba(100, 210, 255, 0.3)';
        ctx.lineWidth = 1;
        this.roundRect(ctx, x, y, w, h, this.p(12));
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `${this.p(12)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('目标水位', cx, y + this.p(12));

        ctx.fillStyle = '#64d2ff';
        ctx.font = `bold ${this.p(28)}px sans-serif`;
        ctx.shadowColor = 'rgba(100, 210, 255, 0.5)';
        ctx.shadowBlur = this.p(10);
        ctx.fillText(`${model.targetWaterLevel}% (±${model.allowedError}%)`, cx, y + this.p(35));

        ctx.restore();
    }

    // 重点：自适应游戏区域
    drawGameArea(ctx, lcx, ly, lAvailableH, model) {
        const cx = this.p(lcx);
        const startY = this.p(ly);
        const availableH = this.p(lAvailableH); // 物理像素可用高度

        // 定义杯子标准尺寸 (逻辑像素)
        const LOGIC_GLASS_W = 100;
        const LOGIC_GLASS_H = 140;
        const LOGIC_FAUCET_SPACE = 60; // 水龙头需要的高度
        const LOGIC_TOTAL_H = LOGIC_GLASS_H + LOGIC_FAUCET_SPACE + 20; // +20 margin

        const totalNeededH = this.p(LOGIC_TOTAL_H);

        // 计算缩放比例：如果可用高度不够，就整体缩小
        let scale = 1.0;
        if (availableH < totalNeededH) {
            scale = availableH / totalNeededH;
        }
        // 限制最大缩放，防止在大屏上过大
        if (scale > 1.2) scale = 1.2;

        const glassW = this.p(LOGIC_GLASS_W) * scale;
        const glassH = this.p(LOGIC_GLASS_H) * scale;
        const faucetSpace = this.p(LOGIC_FAUCET_SPACE) * scale;

        // 计算垂直居中
        // 内容总物理高度
        const contentH = glassH + faucetSpace;
        const contentStartY = startY + (availableH - contentH) / 2;

        // --- 绘制 ---

        // 1. 水龙头
        const faucetY = contentStartY; // 水龙头顶部
        this.drawFaucet(ctx, cx, faucetY, scale, model, glassH + faucetSpace, contentStartY + faucetSpace);

        // 2. 杯子
        const glassY = contentStartY + faucetSpace;
        this.drawGlass(ctx, cx, glassY, glassW, glassH, scale, model);
    }

    drawFaucet(ctx, cx, y, scale, model, streamMaxLen, streamStartY) {
        const fW = this.p(80) * scale;
        const fH = this.p(25) * scale;

        // 水龙头本体
        const gradBody = ctx.createLinearGradient(cx - fW / 2, y, cx + fW / 2, y);
        gradBody.addColorStop(0, '#8e9eab');
        gradBody.addColorStop(1, '#5c6b77');
        ctx.fillStyle = gradBody;
        this.roundRect(ctx, cx - fW / 2, y, fW, fH, this.p(5) * scale);
        ctx.fill();

        ctx.fillStyle = '#6b7a86';
        ctx.fillRect(cx - this.p(10) * scale, y - this.p(10) * scale, this.p(20) * scale, this.p(15) * scale);

        const spoutW = this.p(20) * scale;
        const spoutH = this.p(25) * scale;
        const spoutY = y + fH;

        ctx.fillStyle = '#6b7a86';
        this.roundRect(ctx, cx - spoutW / 2, spoutY, spoutW, spoutH, 0);
        ctx.fill();

        // 水流
        if (model.isPouring) {
            ctx.save();
            const streamW = this.p(10) * scale;
            const streamStart = spoutY + spoutH - this.p(5); // 稍微往上一点防穿帮
            // 水流终点：杯子底部稍微上来一点
            const streamEnd = streamStartY + this.p(130) * scale; // 粗略估算到杯底

            const streamGrad = ctx.createLinearGradient(cx, streamStart, cx, streamEnd);
            streamGrad.addColorStop(0, 'rgba(100, 200, 255, 0.9)');
            streamGrad.addColorStop(1, 'rgba(100, 200, 255, 0.5)');
            ctx.fillStyle = streamGrad;
            ctx.fillRect(cx - streamW / 2, streamStart, streamW, streamEnd - streamStart);
            ctx.restore();
        }
    }

    drawGlass(ctx, cx, y, w, h, scale, model) {
        ctx.save();
        ctx.translate(cx - w / 2, y);

        // 底座
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        this.roundRect(ctx, 0, h, w, this.p(10) * scale, this.p(5) * scale);
        ctx.fill();

        // 轮廓路径
        ctx.beginPath();
        const r = this.p(20) * scale;
        ctx.moveTo(0, 0);
        ctx.lineTo(0, h - r);
        ctx.quadraticCurveTo(0, h, r, h);
        ctx.lineTo(w - r, h);
        ctx.quadraticCurveTo(w, h, w, h - r);
        ctx.lineTo(w, 0);

        // 填充
        const glassGrad = ctx.createLinearGradient(0, 0, w, 0);
        glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        glassGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.2)');
        glassGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.1)');
        glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
        ctx.fillStyle = glassGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = this.p(2) * scale;
        ctx.stroke();

        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, this.p(10) * scale, this.p(10) * scale, this.p(15) * scale, h * 0.6, this.p(5) * scale);
        ctx.fill();

        // 水
        if (model.currentWaterLevel > 0) {
            const waterH = (h * model.currentWaterLevel) / 100;
            const waterY = h - waterH;

            ctx.save();
            // Clip
            ctx.beginPath();
            ctx.moveTo(0, 0);
            // ... same glass path for clip
            ctx.lineTo(0, h - r);
            ctx.quadraticCurveTo(0, h, r, h);
            ctx.lineTo(w - r, h);
            ctx.quadraticCurveTo(w, h, w, h - r);
            ctx.lineTo(w, 0);
            ctx.clip();

            const waterGrad = ctx.createLinearGradient(0, waterY, 0, h);
            waterGrad.addColorStop(0, 'rgba(100, 210, 255, 0.7)');
            waterGrad.addColorStop(0.5, 'rgba(50, 150, 220, 0.8)');
            waterGrad.addColorStop(1, 'rgba(30, 120, 200, 0.9)');
            ctx.fillStyle = waterGrad;
            ctx.fillRect(0, waterY, w, waterH);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(0, waterY, w, this.p(4) * scale);
            ctx.restore();
        }

        // 目标线
        const targetLineY = h - (h * model.targetWaterLevel) / 100;
        ctx.beginPath();
        ctx.setLineDash([this.p(5) * scale, this.p(5) * scale]);
        ctx.strokeStyle = 'rgba(255, 180, 180, 0.5)';
        ctx.lineWidth = this.p(2) * scale;
        ctx.moveTo(-this.p(15) * scale, targetLineY);
        ctx.lineTo(w + this.p(15) * scale, targetLineY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(255, 180, 180, 0.8)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${this.p(10) * scale}px sans-serif`;
        ctx.fillText('目标', w + this.p(18) * scale, targetLineY + this.p(4) * scale);

        ctx.restore();
    }

    drawControls(ctx, lcx, ly, lh, model) {
        const cx = this.p(lcx);
        const y = this.p(ly);
        const h = this.p(lh);

        const centerY = y + h / 2;

        // 倒水按钮
        const btnRadius = this.p(50);
        // 确保不会贴底，稍微向上
        const btnY = centerY - this.p(10);

        // 保存点击区域 (物理坐标)
        this.pourBtnArea = { x: cx, y: btnY, r: btnRadius };

        ctx.save();
        ctx.translate(cx, btnY);

        const btnGrad = ctx.createLinearGradient(-btnRadius, -btnRadius, btnRadius, btnRadius);
        if (model.isPouring) {
            btnGrad.addColorStop(0, '#3a9fc9');
            btnGrad.addColorStop(1, '#2a7f9f');
            ctx.scale(0.95, 0.95);
        } else {
            btnGrad.addColorStop(0, '#64d2ff');
            btnGrad.addColorStop(1, '#3a9fc9');
        }

        ctx.beginPath();
        ctx.arc(0, 0, btnRadius, 0, Math.PI * 2);
        ctx.fillStyle = btnGrad;
        ctx.fill();

        if (!model.isPouring) {
            ctx.shadowColor = 'rgba(100, 210, 255, 0.4)';
            ctx.shadowBlur = this.p(15);
            ctx.shadowOffsetY = this.p(8);
        }

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 0;
        ctx.textBaseline = 'middle';
        ctx.font = `${this.p(30)}px sans-serif`;
        ctx.fillText('💧', 0, -this.p(10));
        ctx.font = `bold ${this.p(14)}px sans-serif`;
        ctx.fillText('按住倒水', 0, this.p(20));

        ctx.restore();

        // 左右按钮
        const btnW = this.p(90);
        const btnH = this.p(40);
        const spacing = this.p(20);

        const confirmX = cx - btnRadius - spacing - btnW / 2;
        if (model.currentWaterLevel > 0 && !model.gameEnded) {
            this.drawButton(ctx, confirmX, btnY, btnW, btnH, '✓ 确认', '#5dff64');
            this.confirmBtnArea = { x: confirmX, y: btnY, w: btnW, h: btnH };
        } else {
            this.confirmBtnArea = null;
        }

        const resetX = cx + btnRadius + spacing + btnW / 2;
        this.drawButton(ctx, resetX, btnY, btnW, btnH, '↺ 重置', 'rgba(255,255,255,0.1)', true);
        this.resetBtnArea = { x: resetX, y: btnY, w: btnW, h: btnH };
    }

    drawButton(ctx, x, y, w, h, text, color, isOutline = false) {
        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = color;
        if (!isOutline && color.includes('#')) {
            ctx.shadowColor = color;
            ctx.shadowBlur = this.p(10);
        }

        this.roundRect(ctx, -w / 2, -h / 2, w, h, this.p(12));
        ctx.fill();

        if (isOutline) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${this.p(12)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(text, 0, 0);

        ctx.restore();
    }

    drawResultModal(ctx, w, h, result, model) {
        const mw = Math.min(w * 0.8, this.p(320));
        const mh = mw * 0.9;
        const cx = w / 2;
        const cy = h / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, w, h);

        // Modal Body
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = this.p(30);
        ctx.fillStyle = '#1e2a4a';
        this.roundRect(ctx, cx - mw / 2, cy - mh / 2, mw, mh, this.p(24));
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let title = '';
        let icon = '';
        let color = '#fff';

        if (model.gameOver) {
            icon = '💔';
            title = '游戏结束';
            color = '#ff6b6b';
        } else if (result.isSuccess) {
            icon = '🎉';
            title = '太棒了！';
            color = '#5dff64';
        } else {
            icon = '😢';
            title = '再试一次';
            color = '#ff6b6b';
        }

        // Icon & Title
        const contentY = cy - this.p(20);
        ctx.font = `${this.p(50)}px serif`;
        ctx.fillText(icon, cx, contentY - this.p(50));

        ctx.fillStyle = color;
        ctx.font = `bold ${this.p(24)}px sans-serif`;
        ctx.fillText(title, cx, contentY);

        // Details
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = `${this.p(16)}px sans-serif`;
        ctx.fillText(`误差: ${result.error}%`, cx, contentY + this.p(40));

        // New Record
        if (model.newRecordAchieved && model.gameOver) {
            ctx.fillStyle = '#ffd700';
            ctx.font = `bold ${this.p(18)}px sans-serif`;
            ctx.fillText('🏆 新纪录！', cx, contentY - this.p(110));
        }

        // Button
        const btnY = cy + mh / 2 - this.p(50);
        this.drawButton(ctx, cx, btnY, this.p(140), this.p(44), model.gameOver ? '重新开始' : result.isSuccess ? '下一关' : '再试一次', '#64d2ff');
        this.modalBtnArea = { x: cx, y: btnY, w: this.p(140), h: this.p(44) };

        ctx.restore();
    }

    roundRect(ctx, x, y, w, h, radius) {
        ctx.beginPath();
        if (typeof radius === 'number') {
            radius = { tl: radius, tr: radius, br: radius, bl: radius };
        } else if (Array.isArray(radius)) {
            radius = { tl: radius[0], tr: radius[1], br: radius[2], bl: radius[3] };
        }

        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + w - radius.tr, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius.tr);
        ctx.lineTo(x + w, y + h - radius.br);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius.br, y + h);
        ctx.lineTo(x + radius.bl, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();
    }
}
