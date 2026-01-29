/**
 * 负责 Canvas 渲染
 * 响应式布局版本：使用百分比+约束的方式适配不同屏幕
 */
export default class Renderer {
    constructor() {
        this.canvas = wx.createCanvas();
        this.ctx = this.canvas.getContext('2d');

        // 获取系统信息
        const systemInfo = wx.getSystemInfoSync();
        this.dpr = systemInfo.pixelRatio;
        this.windowWidth = systemInfo.windowWidth;
        this.windowHeight = systemInfo.windowHeight;

        // 设置 Canvas 尺寸
        if (this.canvas.width !== this.windowWidth * this.dpr) {
            this.canvas.width = this.windowWidth * this.dpr;
            this.canvas.height = this.windowHeight * this.dpr;
        }

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // 初始化点击区域
        this.pourBtnArea = null;
        this.confirmBtnArea = null;
        this.resetBtnArea = null;
        this.clearBtnArea = null;
        this.modalBtnArea = null;
    }

    // 逻辑像素转物理像素
    p(v) {
        return v * this.dpr;
    }

    // 计算统一布局 (UI Scale System)
    calculateLayout(logicW, logicH) {
        // 1. 计算有效卡片宽度
        // 手机全屏，平板限制最大宽度
        const maxCardW = 520;
        const cardW = Math.min(logicW, maxCardW);

        // 2. 计算 UI 缩放系数 (基于 iPhone 6/7/8 的 375px 宽度)
        let uiScale = cardW / 375;
        // 限制缩放范围 [0.85, 1.2]，防止过小或过大
        uiScale = Math.max(0.85, Math.min(1.2, uiScale));

        // 3. 定义基准高度 (Base Heights @ scale=1.0)
        // 顶部安全区 + 间距
        const baseTopPadding = 45;
        // 头部标题区域
        const baseHeaderH = 55; // 50 -> 55 (增加高度)
        // 统计区域
        const baseStatsH = 65;
        // 目标水位区域
        const baseTargetH = 75;
        // 底部控制区域 (包含倒水按钮和底部操作栏)
        const baseControlsH = 210;
        // 区域间隔 (新增)
        const baseSectionSpacing = 8;


        // 4. 计算实际高度
        const topPadding = baseTopPadding; // padding通常不缩放，或者轻微缩放
        const headerH = baseHeaderH * uiScale;
        const statsH = baseStatsH * uiScale;
        const targetH = baseTargetH * uiScale;
        const controlsH = baseControlsH * uiScale;
        const spacing = baseSectionSpacing * uiScale;

        // 5. 计算剩余给游戏区域的高度 (减去间隔)
        // Header -> Spacing -> Stats -> Spacing -> Target -> Spacing -> GameArea -> Controls
        // 注意：Controls 通常底部对齐，GameArea 填充中间
        const usedH = topPadding + headerH + statsH + targetH + spacing * 3 + controlsH;
        let gameAreaH = logicH - usedH;

        // 保护：如果游戏区太小（极端横屏或超小屏），压缩控制区
        if (gameAreaH < 150) {
            // 尝试从 Controls 借一点空间
            gameAreaH = 150;
        }

        // 6. 区域 Y 坐标计算
        const headerY = topPadding;
        const statsY = headerY + headerH + spacing;
        const targetY = statsY + statsH + spacing;
        const gameAreaY = targetY + targetH + spacing;
        const controlsY = gameAreaY + gameAreaH;

        return {
            uiScale,
            cardW,
            topPadding,
            headerH,
            statsH,
            targetH,
            gameAreaH,
            controlsH,
            headerY,
            statsY,
            targetY,
            gameAreaY,
            controlsY
        };
    }

    render(gameModel) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // 逻辑尺寸
        const logicW = this.windowWidth;
        const logicH = this.windowHeight;

        // 清空画布
        ctx.clearRect(0, 0, w, h);

        // 绘制背景
        this.drawBackground(ctx, w, h);

        // --- 使用新的 UI Scale System 计算布局 ---
        const layout = this.calculateLayout(logicW, logicH);

        // 保存布局信息供交互使用
        this.layoutInfo = {
            cardW: layout.cardW,
            gameAreaH: layout.gameAreaH,
            uiScale: layout.uiScale,
            glassScale: layout.uiScale // glassScale 也可以跟随 uiScale
        };

        this.layout = {
            controlsY: layout.controlsY,
            centerX: logicW / 2
        };

        // 卡片尺寸
        const cardX = (logicW - layout.cardW) / 2;
        const cardH = layout.gameAreaH + layout.headerH + layout.statsH + layout.targetH + layout.controlsH + layout.topPadding; // rough total used

        // 绘制各部分 (传入 layout 对象)
        this.drawHeader(ctx, logicW / 2, layout.headerY, layout.headerH, layout.uiScale);
        this.drawStats(ctx, logicW / 2, layout.statsY, layout.statsH, layout.cardW - 30 * layout.uiScale, gameModel, layout.uiScale);
        // 注意：target, gameArea, controls 下一步更新
        this.drawTargetDisplay(ctx, logicW / 2, layout.targetY, layout.targetH, layout.cardW - 30 * layout.uiScale, gameModel, layout.uiScale);
        this.drawGameArea(ctx, logicW / 2, layout.gameAreaY, layout.gameAreaH, gameModel, layout.uiScale);
        this.drawControls(ctx, logicW / 2, layout.controlsY, layout.controlsH, layout.cardW - 30 * layout.uiScale, gameModel, layout.uiScale);
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
        // 卡片绘制逻辑已简化或移除，直接绘制各部分
    }

    drawHeader(ctx, lcx, ly, lh, uiScale = 1.0) {
        const cx = this.p(lcx);
        const y = this.p(ly);
        const h = this.p(lh);

        // 动态计算字体大小
        const fontSize = 24 * uiScale;
        const subFontSize = 14 * uiScale;

        // 垂直居中偏移
        const titleY = y + h * 0.35;
        const subY = y + h * 0.75;

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${this.p(fontSize)}px sans-serif`;
        ctx.shadowColor = 'rgba(100, 200, 255, 0.5)';
        ctx.shadowBlur = this.p(12 * uiScale);
        ctx.fillText('💧 接水大挑战', cx, titleY);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = `${this.p(subFontSize)}px sans-serif`;
        ctx.fillText('控制水位，挑战精准度！', cx, subY);
    }

    drawStats(ctx, lcx, ly, lh, lw, model, uiScale = 1.0) {
        const cx = this.p(lcx);
        const y = this.p(ly);
        const h = this.p(lh);
        const w = this.p(lw);
        const x = cx - w / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        this.roundRect(ctx, x, y, w, h, this.p(10 * uiScale));
        ctx.fill();

        const itemW = w / 3;

        // 动态字体大小
        const labelSize = this.p(13 * uiScale);
        const valueSize = this.p(24 * uiScale);
        const subSize = this.p(11 * uiScale);

        // 垂直居中分布
        const labelY = y + h * 0.22;
        const valueY = y + h * 0.50;
        const subY = y + h * 0.78;

        const drawItem = (label, value, idx, subText = null) => {
            const ix = x + itemW * idx + itemW / 2;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = `${labelSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, ix, labelY);

            ctx.fillStyle = '#64d2ff';
            ctx.font = `bold ${valueSize}px sans-serif`;
            ctx.fillText(value, ix, valueY);

            if (subText) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.font = `${subSize}px sans-serif`;
                ctx.fillText(subText, ix, subY);
            }
        };

        drawItem('回合', model.round, 0);
        drawItem('得分', model.score, 1);
        // --- 使用新的 UI Scale System 计算布局 ---
        const layout = this.calculateLayout(logicW, logicH);

        // 保存布局信息供交互使用
        this.layoutInfo = {
            cardW: layout.cardW,
            gameAreaH: layout.gameAreaH,
            uiScale: layout.uiScale,
            glassScale: layout.uiScale // glassScale 也可以跟随 uiScale
        };

        this.layout = {
            controlsY: layout.controlsY,
            centerX: logicW / 2
        };

        // 卡片尺寸
        const cardX = (logicW - layout.cardW) / 2;
        const cardH = layout.gameAreaH + layout.headerH + layout.statsH + layout.targetH + layout.controlsH + layout.topPadding; // rough total used

        // 绘制各部分 (传入 layout 对象)
        this.drawHeader(ctx, logicW / 2, layout.headerY, layout.headerH, layout.uiScale);
        this.drawStats(ctx, logicW / 2, layout.statsY, layout.statsH, layout.cardW - 30 * layout.uiScale, gameModel, layout.uiScale);
        // 注意：target, gameArea, controls 下一步更新
        this.drawTargetDisplay(ctx, logicW / 2, layout.targetY, layout.targetH, layout.cardW - 30 * layout.uiScale, gameModel, layout.uiScale);
        this.drawGameArea(ctx, logicW / 2, layout.gameAreaY, layout.gameAreaH, gameModel, layout.uiScale);
        this.drawControls(ctx, logicW / 2, layout.controlsY, layout.controlsH, layout.cardW - 30 * layout.uiScale, gameModel, layout.uiScale);
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
        // 卡片绘制逻辑已简化或移除，直接绘制各部分
    }

    drawHeader(ctx, lcx, ly, lh, uiScale = 1.0) {
        const cx = this.p(lcx);
        const y = this.p(ly);
        const h = this.p(lh);

        // 动态计算字体大小
        const fontSize = 24 * uiScale;
        const subFontSize = 14 * uiScale;

        // 垂直居中偏移
        const titleY = y + h * 0.30; // 0.35 -> 0.30 (上移)
        const subY = y + h * 0.85;   // 0.75 -> 0.85 (下移)

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${this.p(fontSize)}px sans-serif`;
        ctx.shadowColor = 'rgba(100, 200, 255, 0.5)';
        ctx.shadowBlur = this.p(12 * uiScale);
        ctx.fillText('💧 接水大挑战', cx, titleY);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = `${this.p(subFontSize)}px sans-serif`;
        ctx.fillText('控制水位，挑战精准度！', cx, subY);
    }

    drawStats(ctx, lcx, ly, lh, lw, model, uiScale = 1.0) {
        const cx = this.p(lcx);
        const y = this.p(ly);
        const h = this.p(lh);
        const w = this.p(lw);
        const x = cx - w / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        this.roundRect(ctx, x, y, w, h, this.p(10 * uiScale));
        ctx.fill();

        const itemW = w / 3;

        // 动态字体大小
        const labelSize = this.p(13 * uiScale);
        const valueSize = this.p(24 * uiScale);
        const subSize = this.p(11 * uiScale);

        // 垂直居中分布 (拉大间距)
        const labelY = y + h * 0.20; // 0.22 -> 0.20
        const valueY = y + h * 0.52; // 0.50 -> 0.52
        const subY = y + h * 0.80;   // 0.78 -> 0.80

        const drawItem = (label, value, idx, subText = null) => {
            const ix = x + itemW * idx + itemW / 2;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = `${labelSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, ix, labelY);

            ctx.fillStyle = '#64d2ff';
            ctx.font = `bold ${valueSize}px sans-serif`;
            ctx.fillText(value, ix, valueY);

            if (subText) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.font = `${subSize}px sans-serif`;
                ctx.fillText(subText, ix, subY);
            }
        };

        drawItem('回合', model.round, 0);
        drawItem('得分', model.score, 1);
        drawItem('最高分', model.highScore, 2, model.highScoreTime);

        ctx.restore();
    }

    drawTargetDisplay(ctx, lcx, ly, lh, lw, model, uiScale = 1.0) {
        const cx = this.p(lcx);
        const y = this.p(ly);
        const h = this.p(lh);
        const w = this.p(lw);
        const x = cx - w / 2;

        ctx.save();
        const grad = ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, 'rgba(100, 210, 255, 0.2)');
        grad.addColorStop(1, 'rgba(100, 150, 255, 0.1)');
        ctx.fillStyle = grad;
        ctx.strokeStyle = 'rgba(100, 210, 255, 0.3)';
        ctx.lineWidth = 1;
        this.roundRect(ctx, x, y, w, h, this.p(10 * uiScale));
        ctx.fill();
        ctx.stroke();

        // 动态计算字体
        const labelSize = this.p(14 * uiScale);
        const valueSize = this.p(30 * uiScale); // 大数字

        // 垂直居中分布 (拉大间距)
        const labelY = y + h * 0.25; // 0.28 -> 0.25 (上移)
        const valueY = y + h * 0.65; // 0.62 -> 0.65 (下移)

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `${labelSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('目标水位', cx, labelY);

        ctx.fillStyle = '#64d2ff';
        ctx.font = `bold ${valueSize}px sans-serif`;
        ctx.shadowColor = 'rgba(100, 210, 255, 0.5)';
        ctx.shadowBlur = this.p(8 * uiScale);
        ctx.fillText(`${model.targetWaterLevel}% (±${model.allowedError}%)`, cx, valueY);

        ctx.restore();
    }

    drawGameArea(ctx, lcx, ly, lAvailableH, model, uiScale = 1.0) {
        const cx = this.p(lcx);
        const startY = this.p(ly);
        const availableH = this.p(lAvailableH);

        // 基础杯子尺寸 (基于 scale=1.0)
        let baseGlassW = 140;
        let baseGlassH = 200;
        let baseFaucetSpace = 75;

        // 应用 UI Scale
        const glassW = baseGlassW * uiScale;
        const glassH = baseGlassH * uiScale;
        const faucetSpace = baseFaucetSpace * uiScale;

        // 动态计算最终缩放比例 (基于可用高度)
        const totalBaseH = this.p(glassH + faucetSpace);
        let finalScale = 1.0;

        // 目标填充高度：可用高度的 65%~75%
        const targetFillH = availableH * 0.70;

        if (totalBaseH < targetFillH) {
            // 空间很大，放大填充
            finalScale = targetFillH / totalBaseH;
            // 限制最大放大倍数 (防止过大)
            finalScale = Math.min(finalScale, 1.4);
        } else if (totalBaseH > availableH) {
            // 空间不足，缩小适应 (留5%余量)
            finalScale = availableH / totalBaseH * 0.95;
        }

        // 宽度限制检查 (防止超出卡片宽度)
        const currentLogicW = glassW * finalScale;
        const maxLogicW = (this.layoutInfo?.cardW || 300) - 30 * uiScale;
        if (currentLogicW > this.p(maxLogicW)) {
            finalScale = this.p(maxLogicW) / glassW;
        }

        const finalGlassW = this.p(glassW) * finalScale;
        const finalGlassH = this.p(glassH) * finalScale;
        const finalFaucetSpace = this.p(faucetSpace) * finalScale;

        // 垂直居中
        const contentH = finalGlassH + finalFaucetSpace;
        const contentStartY = startY + (availableH - contentH) / 2;

        // 绘制水龙头 (传递总缩放比例)
        this.drawFaucet(ctx, cx, contentStartY, finalScale * uiScale, model, finalGlassH);

        // 绘制杯子
        const glassY = contentStartY + finalFaucetSpace;
        this.drawGlass(ctx, cx, glassY, finalGlassW, finalGlassH, finalScale * uiScale, model);
    }

    drawFaucet(ctx, cx, y, scale, model, glassH) {
        // ... (保持原逻辑，只需确保 scale 参数正确传递)
        // 这里的 scale 已经是 finalScale * uiScale
        // ...
        const fW = this.p(60) * scale;
        const fH = this.p(18) * scale;

        // ... (以下绘制逻辑通用，只需scale正确即可)
        // 为节省篇幅，这里假设原有 drawFaucet 实现兼容 scale 参数
        // 实际上 drawFaucet 内部全依赖 scale，所以直接复用即可，无需重写内部逻辑，
        // 只要调用者传对 scale。
        // 但如果要重写整个块，我需要把 drawFaucet 的内容也放进去吗？
        // 既然我正在替换整个区域，最好保留 drawFaucet 的完整实现。

        // 水龙头本体
        const gradBody = ctx.createLinearGradient(cx - fW / 2, y, cx + fW / 2, y);
        gradBody.addColorStop(0, '#8e9eab');
        gradBody.addColorStop(1, '#5c6b77');
        ctx.fillStyle = gradBody;
        this.roundRect(ctx, cx - fW / 2, y, fW, fH, this.p(4) * scale);
        ctx.fill();

        // 水龙头顶部
        ctx.fillStyle = '#6b7a86';
        ctx.fillRect(cx - this.p(8) * scale, y - this.p(8) * scale, this.p(16) * scale, this.p(10) * scale);

        // 水龙头出水口
        const spoutW = this.p(14) * scale;
        const spoutH = this.p(18) * scale;
        const spoutY = y + fH;
        ctx.fillStyle = '#6b7a86';
        ctx.fillRect(cx - spoutW / 2, spoutY, spoutW, spoutH);

        // 水流
        if (model.isPouring) {
            ctx.save();
            const streamW = this.p(8) * scale;
            const streamStart = spoutY + spoutH - 2;
            const streamEnd = streamStart + glassH * 0.7;

            const streamGrad = ctx.createLinearGradient(cx, streamStart, cx, streamEnd);
            streamGrad.addColorStop(0, 'rgba(100, 200, 255, 0.9)');
            streamGrad.addColorStop(1, 'rgba(100, 200, 255, 0.4)');
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
        this.roundRect(ctx, 0, h, w, this.p(8) * scale, this.p(4) * scale);
        ctx.fill();

        // 杯子轮廓
        const r = this.p(15) * scale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, h - r);
        ctx.quadraticCurveTo(0, h, r, h);
        ctx.lineTo(w - r, h);
        ctx.quadraticCurveTo(w, h, w, h - r);
        ctx.lineTo(w, 0);

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
        this.roundRect(ctx, this.p(8) * scale, this.p(8) * scale, this.p(10) * scale, h * 0.5, this.p(4) * scale);
        ctx.fill();

        // 水
        if (model.currentWaterLevel > 0) {
            const waterH = (h * model.currentWaterLevel) / 100;
            const waterY = h - waterH;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, 0);
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

            // 水面高光
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(0, waterY, w, this.p(3) * scale);
            ctx.restore();
        }

        // 目标线
        const targetLineY = h - (h * model.targetWaterLevel) / 100;
        ctx.beginPath();
        ctx.setLineDash([this.p(4) * scale, this.p(4) * scale]);
        ctx.strokeStyle = 'rgba(255, 150, 150, 0.6)';
        ctx.lineWidth = this.p(2) * scale;
        ctx.moveTo(-this.p(10) * scale, targetLineY);
        ctx.lineTo(w + this.p(10) * scale, targetLineY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
    }

    drawControls(ctx, lcx, ly, lh, lContainerW, model, uiScale = 1.0) {
        const cx = this.p(lcx);
        const y = this.p(ly);
        const h = this.p(lh);
        const containerW = this.p(lContainerW);

        // 倒水按钮半径
        const btnRadius = this.p(45 * uiScale);
        // 按钮垂直居中偏上
        const pourBtnY = y + h * 0.35;

        this.pourBtnArea = { x: cx, y: pourBtnY, r: btnRadius };

        ctx.save();
        ctx.translate(cx, pourBtnY);

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
            ctx.shadowBlur = this.p(10 * uiScale);
            ctx.shadowOffsetY = this.p(4 * uiScale);
        }

        // 按钮文字和图标
        const iconSize = this.p(24 * uiScale);
        const textSize = this.p(15 * uiScale);
        const iconOffsetY = -this.p(6 * uiScale);
        const textOffsetY = this.p(14 * uiScale);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 0;
        ctx.textBaseline = 'middle';
        ctx.font = `${iconSize}px sans-serif`;
        ctx.fillText('💧', 0, iconOffsetY);
        ctx.font = `bold ${textSize}px sans-serif`;
        ctx.fillText('按住倒水', 0, textOffsetY);

        ctx.restore();

        // 提示文字 (倒水按钮下方)
        const hintFontSize = this.p(12 * uiScale);
        const hintGap = this.p(15 * uiScale);
        const hintY = pourBtnY + btnRadius + hintGap;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = `${hintFontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('按住按钮开始倒水，松开停止', cx, hintY);

        // 底部操作栏 (确认/重开/删除)
        // 使用 uiScale 计算间距
        const bottomBtnGap = this.p(40 * uiScale); // 底部 margin
        const bottomBtnY = y + h - bottomBtnGap;
        const btnH = this.p(36 * uiScale);
        const btnSpacing = this.p(6 * uiScale);

        const availableW = containerW - btnSpacing * 2;
        const btnW1 = availableW * 0.40;
        const btnW2 = availableW * 0.40;
        const btnW3 = availableW * 0.20;

        const startX = cx - containerW / 2;

        const confirmX = startX + btnW1 / 2;
        this.drawButton(ctx, confirmX, bottomBtnY, btnW1, btnH, '✓ 确认', 'rgba(255,255,255,0.08)', true, '#86efac');
        this.confirmBtnArea = { x: confirmX, y: bottomBtnY, w: btnW1, h: btnH };

        const resetX = startX + btnW1 + btnSpacing + btnW2 / 2;
        this.drawButton(ctx, resetX, bottomBtnY, btnW2, btnH, '↺ 重开', 'rgba(255,255,255,0.08)', true, '#fca5a5');
        this.resetBtnArea = { x: resetX, y: bottomBtnY, w: btnW2, h: btnH };

        const clearX = startX + btnW1 + btnSpacing + btnW2 + btnSpacing + btnW3 / 2;
        this.drawButton(ctx, clearX, bottomBtnY, btnW3, btnH, '🗑️', 'rgba(255,255,255,0.08)', true, '#fff');
        this.clearBtnArea = { x: clearX, y: bottomBtnY, w: btnW3, h: btnH };
    }

    drawButton(ctx, x, y, w, h, text, color, isOutline = false, textColor = '#fff') {
        const uiScale = this.layoutInfo?.uiScale || 1.0;

        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = color;
        this.roundRect(ctx, -w / 2, -h / 2, w, h, this.p(10 * uiScale));
        ctx.fill();

        if (isOutline) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 动态文字大小
        const fontSize = 15 * uiScale;

        ctx.fillStyle = textColor;
        ctx.font = `bold ${this.p(fontSize)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);

        ctx.restore();
    }

    drawResultModal(ctx, w, h, result, model) {
        const uiScale = this.layoutInfo?.uiScale || 1.0;

        const mw = Math.min(w * 0.8, this.p(280 * uiScale));
        const mh = mw * 0.85;
        const modalCx = w / 2;
        const modalCy = h / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, w, h);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = this.p(25 * uiScale);
        ctx.fillStyle = '#1e2a4a';
        this.roundRect(ctx, modalCx - mw / 2, modalCy - mh / 2, mw, mh, this.p(20 * uiScale));
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let title, icon, color;
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

        const contentY = modalCy - this.p(15 * uiScale);

        ctx.font = `${this.p(40 * uiScale)}px serif`;
        ctx.fillText(icon, modalCx, contentY - this.p(40 * uiScale));

        ctx.fillStyle = color;
        ctx.font = `bold ${this.p(20 * uiScale)}px sans-serif`;
        ctx.fillText(title, modalCx, contentY);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = `${this.p(14 * uiScale)}px sans-serif`;
        ctx.fillText(`误差: ${result.error}%`, modalCx, contentY + this.p(30 * uiScale));

        if (model.newRecordAchieved && model.gameOver) {
            ctx.fillStyle = '#ffd700';
            ctx.font = `bold ${this.p(15 * uiScale)}px sans-serif`;
            ctx.fillText('🏆 新纪录！', modalCx, contentY - this.p(90 * uiScale));
        }

        const btnY = modalCy + mh / 2 - this.p(40 * uiScale);
        const btnText = model.gameOver ? '重新开始' : result.isSuccess ? '下一关' : '再试一次';

        // 使用更新后的 drawButton
        const btnW = this.p(120 * uiScale);
        const btnH = this.p(38 * uiScale);
        this.drawButton(ctx, modalCx, btnY, btnW, btnH, btnText, '#64d2ff');

        this.modalBtnArea = { x: modalCx, y: btnY, w: btnW, h: btnH };

        ctx.restore();
    }

    roundRect(ctx, x, y, w, h, radius) {
        ctx.beginPath();
        if (typeof radius === 'number') {
            radius = { tl: radius, tr: radius, br: radius, bl: radius };
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
