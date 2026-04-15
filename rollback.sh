#!/bin/bash
# ============================================
# one-api 回滚脚本
# ============================================
# 使用方式:
#   ./rollback.sh list     # 列出可用备份
#   ./rollback.sh restore  # 恢复到备份的版本
# ============================================

set -e

SERVER_HOST="39.107.227.198"
SERVER_USER="root"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# 列出可用备份
# ============================================
do_list() {
    log_info "可用备份列表..."

    ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
        echo "=== one-api 数据备份 ==="
        ls -la /opt/one-api/ | grep data-backup

        echo ""
        echo "=== Docker 镜像备份 ==="
        docker images | grep one-api
EOF
}

# ============================================
# 恢复到备份版本
# ============================================
do_restore() {
    log_warn "恢复到备份版本..."

    # 获取最新备份
    BACKUP_DIR=$(ssh ${SERVER_USER}@${SERVER_HOST} "ls -td /opt/one-api/data-backup-* 2>/dev/null | head -1")

    if [ -z "${BACKUP_DIR}" ]; then
        log_error "没有找到可用备份"
        exit 1
    fi

    log_info "使用备份: ${BACKUP_DIR}"

    ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
        set -e

        BACKUP_DIR=$(ls -td /opt/one-api/data-backup-* 2>/dev/null | head -1)

        echo "[INFO] 停止当前容器..."
        docker stop one-api 2>/dev/null || true
        docker rm one-api 2>/dev/null || true

        echo "[INFO] 备份当前数据..."
        rm -rf /opt/one-api/data-current 2>/dev/null || true
        docker cp one-api:/data /opt/one-api/data-current

        echo "[INFO] 恢复备份数据..."
        rm -rf /opt/one-api/data 2>/dev/null || true
        mv ${BACKUP_DIR} /opt/one-api/data

        echo "[INFO] 启动容器 (使用官方镜像)..."
        docker run -d \
          --name one-api \
          -p 3000:3000 \
          -v /opt/one-api/data:/data \
          -e TZ=Asia/Shanghai \
          --restart unless-stopped \
          justsong/one-api:latest

        echo "[INFO] 验证..."
        sleep 3
        curl -s http://localhost:3000/api/status
EOF

    log_info "回滚完成!"
}

# ============================================
# 紧急回滚 (停止测试环境，恢复正式环境)
# ============================================
do_emergency() {
    log_warn "执行紧急回滚..."

    ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
        echo "[INFO] 停止测试容器..."
        docker stop one-api-test 2>/dev/null || true
        docker rm one-api-test 2>/dev/null || true

        echo "[INFO] 检查正式容器状态..."
        if docker ps | grep -q one-api; then
            echo "[INFO] 正式容器正在运行"
        else
            echo "[WARN] 正式容器未运行，正在启动..."
            docker start one-api 2>/dev/null || {
                echo "[ERROR] 启动失败，尝试从备份恢复..."
                BACKUP_DIR=$(ls -td /opt/one-api/data-backup-* 2>/dev/null | head -1)
                if [ -n "${BACKUP_DIR}" ]; then
                    docker run -d \
                      --name one-api \
                      -p 3000:3000 \
                      -v /opt/one-api/data:/data \
                      -e TZ=Asia/Shanghai \
                      --restart unless-stopped \
                      justsong/one-api:latest
                fi
            }
        fi
EOF

    log_info "紧急回滚完成"
}

# ============================================
# 主逻辑
# ============================================
case "${1:-}" in
    list)
        do_list
        ;;
    restore)
        do_restore
        ;;
    emergency)
        do_emergency
        ;;
    *)
        echo "用法: $0 {list|restore|emergency}"
        echo ""
        echo "命令说明:"
        echo "  list      列出可用备份"
        echo "  restore   从最新备份恢复"
        echo "  emergency 紧急回滚 (停止测试环境，恢复正式环境)"
        exit 1
        ;;
esac
