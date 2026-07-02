# Diyou 档案站 - Windows Docker Desktop 一键部署脚本
# 用法：在 PowerShell 中进入项目根目录，执行 .\scripts\windows-deploy.ps1

$ErrorActionPreference = "Stop"
$ComposeFile = "docker-compose.windows.yml"

function Write-Step {
    param([string]$Message)
    Write-Host "`n[+] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[✓] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

function Write-ErrorLine {
    param([string]$Message)
    Write-Host "[✗] $Message" -ForegroundColor Red
}

# 1. 检查当前目录
if (-not (Test-Path $ComposeFile)) {
    Write-ErrorLine "未找到 $ComposeFile，请确保在项目根目录运行此脚本。"
    Write-Host "例如：cd C:\diyou; .\scripts\windows-deploy.ps1"
    exit 1
}

# 2. 检查 .env 文件
if (-not (Test-Path ".env")) {
    Write-Warn "未找到 .env 文件。"
    if (Test-Path ".env.example") {
        Write-Host "正在从 .env.example 复制 .env..."
        Copy-Item ".env.example" ".env"
        Write-Warn ".env 已创建，但你需要先编辑它，至少修改 JWT_SECRET、ADMIN_PASSWORD、SITE_ADDRESS、CORS_ORIGIN。"
        Write-Host "请用记事本打开 .env 修改后，重新运行此脚本。"
        notepad ".env"
        exit 1
    } else {
        Write-ErrorLine "未找到 .env.example，无法自动生成 .env。"
        exit 1
    }
}

# 3. 检查 Docker 是否安装和运行
Write-Step "检查 Docker 状态..."
try {
    $dockerVersion = docker --version 2>&1
    Write-Success "Docker 已安装：$dockerVersion"
} catch {
    Write-ErrorLine "Docker 未安装或未加入系统 PATH。请先安装 Docker Desktop 并重启电脑。"
    exit 1
}

try {
    $composeVersion = docker compose version 2>&1
    Write-Success "Docker Compose 可用：$composeVersion"
} catch {
    Write-ErrorLine "Docker Compose 不可用。请升级 Docker Desktop 到最新版。"
    exit 1
}

try {
    docker info > $null 2>&1
    Write-Success "Docker 守护进程正在运行"
} catch {
    Write-ErrorLine "Docker 守护进程未运行。请先启动 Docker Desktop，等待 Engine running 后再试。"
    exit 1
}

# 4. 拉取最新镜像
Write-Step "拉取最新镜像..."
docker compose -f $ComposeFile pull
if ($LASTEXITCODE -ne 0) {
    Write-ErrorLine "拉取镜像失败。请检查网络连接，或尝试配置 Docker 镜像加速器。"
    exit 1
}
Write-Success "镜像拉取完成"

# 5. 启动容器
Write-Step "启动服务..."
docker compose -f $ComposeFile up -d
if ($LASTEXITCODE -ne 0) {
    Write-ErrorLine "启动失败。请查看上方错误信息，或运行：docker compose -f $ComposeFile logs"
    exit 1
}
Write-Success "服务已启动"

# 6. 等待健康检查
Write-Step "等待健康检查..."
$maxRetries = 20
$retry = 0
$healthy = $false
while ($retry -lt $maxRetries) {
    Start-Sleep -Seconds 3
    try {
        $status = docker compose -f $ComposeFile ps --format json | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($status) {
            $backend = $status | Where-Object { $_.Service -eq "diyou-backend" }
            $web = $status | Where-Object { $_.Service -eq "diyou-web" }
            if ($backend.Health -eq "healthy" -and $web.State -eq "running") {
                $healthy = $true
                break
            }
        }
    } catch {
        # 继续等待
    }
    Write-Host "  等待服务就绪... ($($retry + 1)/$maxRetries)"
    $retry++
}

if (-not $healthy) {
    Write-Warn "服务尚未完全就绪，请稍后查看日志：docker compose -f $ComposeFile logs -f"
} else {
    Write-Success "服务已就绪"
}

# 7. 显示访问信息
Write-Step "部署完成！"

# 读取 .env 中的配置
$envContent = Get-Content ".env" -Raw
$siteAddress = if ($envContent -match 'SITE_ADDRESS\s*=\s*(.+)') { $matches[1].Trim() } else { "localhost" }
$httpPort = if ($envContent -match 'HTTP_PORT\s*=\s*(\d+)') { $matches[1].Trim() } else { "8080" }

$localUrl = "http://localhost:$httpPort"
$lanUrl = "http://${siteAddress}:$httpPort"

Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host "本机访问地址：$localUrl"
if ($siteAddress -ne "localhost") {
    Write-Host "局域网访问地址：$lanUrl"
}
Write-Host "管理员邮箱：$(if ($envContent -match 'ADMIN_EMAIL\s*=\s*(.+)') { $matches[1].Trim() } else { "admin@diyou.test" })"
Write-Host "管理员密码：.env 中 ADMIN_PASSWORD 的值"
Write-Host "----------------------------------------" -ForegroundColor Green

Write-Host "`n常用命令："
Write-Host "  查看状态：docker compose -f $ComposeFile ps"
Write-Host "  查看日志：docker compose -f $ComposeFile logs -f"
Write-Host "  停止服务：docker compose -f $ComposeFile down"
Write-Host "  重启服务：docker compose -f $ComposeFile restart"
