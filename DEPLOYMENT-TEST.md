# One-API 测试环境部署方案

## 一、目标

在阿里云服务器 `39.107.227.198` 上搭建 one-api 测试环境，验证改造后的功能，不影响正式环境（端口 3000）。

## 二、方案设计

### 推荐方案：Docker 多容器隔离

| 环境 | 容器名 | 端口 | 数据目录 |
|------|--------|------|----------|
| 正式 | `one-api` | 3000 | `/opt/one-api/data/` |
| 测试 | `one-api-test` | 3001 | `/opt/one-api/test-data/` |

**核心原则**：
- 测试环境与正式环境**完全隔离**
- 独立数据目录，互不影响
- 测试通过后，再替换正式环境

## 三、部署流程

### 步骤 1：本地编译镜像

```bash
cd /vol1/@apphome/trim.openclaw/data/workspace/one-api-easy

# 构建镜像（带版本标签，便于区分）
docker build -t one-api:dev .

# 导出为 tar 文件
docker save one-api:dev | gzip > one-api-dev.tar.gz
```

### 步骤 2：上传到服务器

```bash
# 上传到服务器 /tmp 目录
scp one-api-dev.tar.gz root@39.107.227.198:/tmp/

# 或者如果 NAS 和服务器之间有共享存储，直接复制
```

### 步骤 3：服务器导入并启动测试容器

```bash
# SSH 登录服务器
ssh root@39.107.227.198

# 导入镜像
docker load < /tmp/one-api-dev.tar.gz

# 创建测试数据目录
mkdir -p /opt/one-api/test-data

# 启动测试容器
docker run -d \
  --name one-api-test \
  -p 3001:3000 \
  -v /opt/one-api/test-data:/data \
  -e TZ=Asia/Shanghai \
  -e SESSION_SECRET=test_env_random_string \
  --restart unless-stopped \
  one-api:dev

# 注意：测试环境默认使用 SQLite，不依赖 MySQL/Redis
# 如果需要完整依赖，参考 docker-compose.test.yml
```

### 步骤 4：验证测试环境

```bash
# 检查容器状态
docker ps | grep one-api-test

# 检查端口占用
netstat -tlnp | grep 3001

# API 健康检查
curl http://39.107.227.198:3001/api/status
# 预期返回：{"success":true,...}

# 查看日志
docker logs -f one-api-test
```

## 四、回滚方案

### 如果测试环境有问题

```bash
# 停止并删除测试容器
docker stop one-api-test
docker rm one-api-test

# 清理测试数据（可选，保留用于排查）
# rm -rf /opt/one-api/test-data
```

### 如果测试通过，需要升级正式环境

```bash
# 1. 备份正式环境
docker stop one-api
docker cp one-api:/data /opt/one-api/data-backup-$(date +%Y%m%d%H%M%S)

# 2. 停止正式容器
docker stop one-api
docker rm one-api

# 3. 加载新镜像
docker load < /tmp/one-api-dev.tar.gz

# 4. 启动正式容器（使用原配置）
docker run -d \
  --name one-api \
  -p 3000:3000 \
  -v /opt/one-api/data:/data \
  -e TZ=Asia/Shanghai \
  --restart unless-stopped \
  one-api:dev

# 5. 验证
curl http://39.107.227.198:3000/api/status
```

### 回滚到旧版本

```bash
# 如果新版本有问题，从备份恢复
docker stop one-api
docker rm one-api

# 启动旧版本（如果保留着）
docker run -d \
  --name one-api \
  -p 3000:3000 \
  -v /opt/one-api/data:/data \
  -e TZ=Asia/Shanghai \
  --restart unless-stopped \
  justsong/one-api:latest
```

## 五、一键部署脚本

见 `deploy-test.sh`

## 六、注意事项

1. **数据隔离**：测试环境使用独立数据目录，与正式环境完全分开
2. **端口隔离**：测试用 3001，正式用 3000
3. **Session Secret**：测试环境使用独立的随机字符串
4. **默认 SQLite**：测试环境默认使用 SQLite，如果需要完整功能（MySQL + Redis），使用 `docker-compose.test.yml`
5. **验证后再升级**：必须测试通过再替换正式环境

## 七、测试检查清单

- [ ] 容器启动成功：`docker ps | grep one-api-test`
- [ ] 端口监听：`netstat -tlnp | grep 3001`
- [ ] API 健康检查：`curl http://39.107.227.198:3001/api/status`
- [ ] 页面访问：`http://39.107.227.198:3001`
- [ ] 登录功能正常
- [ ] 核心业务功能正常（如渠道配置、API 调用等）
