#!/bin/bash
# ============================================
# one-api 测试环境一键部署脚本
# ============================================
# 使用方式:
#   1. 本地执行: ./deploy-test.sh build    # 构建并导出镜像
#   2. 上传后服务器执行: ./deploy-test.sh deploy  # 部署测试环境
#   3. 服务器执行: ./deploy-test.sh verify # 验证测试环境
#   4. 服务器执行: ./deploy-test.sh cleanup # 清理测试环境
# ============================================

set -e

SERVER_HOST="39.107.227.198"
SERVER_USER="root"
IMAGE_NAME="one-api:dev"
IMAGE_FILE="one-api-dev.tar.gz"
REMOTE_TMP="/tmp/${IMAGE_FILE}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
# 1. 本地构建镜像
# ============================================
do_build() {
    log_info "开始构建镜像..."

    cd "$(dirname "$0")"

    # 检查 Dockerfile 是否存在
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile 不存在，请确保在 one-api-easy 目录下执行"
        exit 1
    fi

    # 构建镜像
    log_info "执行 docker build..."
    docker build -t ${IMAGE_NAME} .

    # 导出镜像
    log_info "导出镜像为 ${IMAGE_FILE}..."
    docker save ${IMAGE_NAME} | gzip > ${IMAGE_FILE}

    # 显示镜像大小
    local size=$(du -h ${IMAGE_FILE} | cut -f1)
    log_info "镜像构建完成: ${IMAGE_NAME} (${size})"
    log_info "下一步: scp ${IMAGE_FILE} ${SERVER_USER}@${SERVER_HOST}:/tmp/"
}

# ============================================
# 2. 服务器部署
# ============================================
do_deploy() {
    log_info "开始部署测试环境到 ${SERVER_HOST}..."

    # 检查镜像文件是否存在
    if [ ! -f "${IMAGE_FILE}" ]; then
        log_error "镜像文件 ${IMAGE_FILE} 不存在，请先执行 ./deploy-test.sh build"
        exit 1
    fi

    # 上传镜像
    log_info "上传镜像到服务器..."
    scp ${IMAGE_FILE} ${SERVER_USER}@${SERVER_HOST}:${REMOTE_TMP}

    # SSH 执行部署
    ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
        set -e

        echo "[INFO] 导入镜像..."
        docker load < /tmp/one-api-dev.tar.gz

        echo "[INFO] 创建测试数据目录..."
        mkdir -p /opt/one-api/test-data

        echo "[INFO] 停止并删除旧测试容器（如果存在）..."
        docker stop one-api-test 2>/dev/null || true
        docker rm one-api-test 2>/dev/null || true

        echo "[INFO] 启动测试容器..."
        docker run -d \
          --name one-api-test \
          -p 3001:3000 \
          -v /opt/one-api/test-data:/data \
          -e TZ=Asia/Shanghai \
          -e SESSION_SECRET=test_$(date +%s)_random_string \
          --restart unless-stopped \
          one-api:dev

        echo "[INFO] 测试容器已启动，等待启动完成..."
        sleep 3

        echo "[INFO] 容器状态:"
        docker ps | grep one-api-test || echo "容器未运行，请检查日志"
EOF

    log_info "部署完成!"
}

# ============================================
# 3. 验证测试环境
# ============================================
do_verify() {
    log_info "验证测试环境..."

    ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
        echo "=== 容器状态 ==="
        docker ps | grep one-api-test || echo "容器未运行"

        echo ""
        echo "=== 端口监听 ==="
        netstat -tlnp | grep 3001 || echo "端口 3001 未监听"

        echo ""
        echo "=== API 健康检查 ==="
        curl -s http://localhost:3001/api/status | head -100

        echo ""
        echo "=== 容器日志 (最近 20 行) ==="
        docker logs --tail 20 one-api-test 2>&1 || echo "无法获取日志"
EOF
}

# ============================================
# 4. 清理测试环境
# ============================================
do_cleanup() {
    log_warn "清理测试环境..."

    ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
        echo "[INFO] 停止测试容器..."
        docker stop one-api-test 2>/dev/null || true

        echo "[INFO] 删除测试容器..."
        docker rm one-api-test 2>/dev/null || true

        echo "[INFO] 测试数据已保留在 /opt/one-api/test-data"
        echo "[INFO] 如需完全清理，执行: rm -rf /opt/one-api/test-data"
EOF

    log_info "清理完成"
}

# ============================================
# 5. 升级正式环境
# ============================================
do_upgrade_prod() {
    log_warn "升级正式环境..."

    ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
        set -e

        echo "[INFO] 备份正式环境数据..."
        BACKUP_DIR="/opt/one-api/data-backup-$(date +%Y%m%d%H%M%S)"
        docker cp one-api:/data ${BACKUP_DIR}
        echo "[INFO] 备份保存到: ${BACKUP_DIR}"

        echo "[INFO] 停止正式容器..."
        docker stop one-api
        docker rm one-api

        echo "[INFO] 加载新镜像..."
        docker load < /tmp/one-api-dev.tar.gz

        echo "[INFO] 启动正式容器..."
        docker run -d \
          --name one-api \
          -p 3000:3000 \
          -v /opt/one-api/data:/data \
          -e TZ=Asia/Shanghai \
          --restart unless-stopped \
          one-api:dev

        echo "[INFO] 等待启动..."
        sleep 3

        echo "[INFO] 验证正式环境..."
        curl -s http://localhost:3000/api/status
EOF

    log_info "升级完成!"
}

# ============================================
# 主逻辑
# ============================================
case "${1:-}" in
    build)
        do_build
        ;;
    deploy)
        do_deploy
        ;;
    verify)
        do_verify
        ;;
    cleanup)
        do_cleanup
        ;;
    upgrade-prod)
        do_upgrade_prod
        ;;
    *)
        echo "用法: $0 {build|deploy|verify|cleanup|upgrade-prod}"
        echo ""
        echo "命令说明:"
        echo "  build        本地构建镜像 (在 one-api-easy 目录执行)"
        echo "  deploy       部署测试环境到服务器"
        echo "  verify       验证测试环境"
        echo "  cleanup      清理测试环境"
        echo "  upgrade-prod 升级正式环境 (测试通过后执行)"
        exit 1
        ;;
esac
