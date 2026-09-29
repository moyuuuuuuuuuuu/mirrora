<template><view class="page legal-page"><AppHeader/><view class="legal-shell"><text class="eyebrow">TERMS OF SERVICE</text><view class="display">用户协议</view><text class="updated">更新及生效日期：2026 年 9 月 29 日</text><view class="intro">欢迎使用“镜界 · AI 私人形象顾问”。请在注册、登录或使用服务前仔细阅读本协议，尤其是责任限制和未成年人相关条款。勾选同意或实际使用服务，即表示你理解并接受本协议。</view><section v-for="item in sections" :key="item.title"><view class="section-title">{{ item.title }}</view><text v-for="p in item.paragraphs" :key="p">{{ p }}</text></section></view></view></template>
<script setup lang="ts">
const sections=[
{title:'一、运营者信息',paragraphs:['本服务由个人运营者郑聪睿提供，运营者所在地为河南省郑州市。与本服务有关的咨询、投诉或个人信息请求，请发送邮件至 moyuuuu@foxmail.com；当前仅通过该邮箱提供联系服务。']},
{title:'二、服务内容',paragraphs:['镜界通过人工智能技术提供发型、肤色与护理、穿搭、妆容和虚拟试穿等形象建议，并保存你主动创建的咨询记录。具体功能以客户端实际提供为准。','AI 生成内容仅供个人形象与审美参考，不构成医疗诊断、治疗建议或其他专业意见，也不保证结果与真实试穿、染发、化妆或护理效果完全一致。']},
{title:'三、账号与使用规则',paragraphs:['你应使用本人可正常接收验证码的邮箱登录，并对账号下的操作负责。不得转让账号、绕过访问控制、干扰服务运行，或利用服务实施违法、侵权、欺诈及危害网络安全的行为。','你上传的人像、服饰图片和填写的偏好应来源合法。上传包含他人的内容前，应取得相关权利人的明确授权；不得上传未获监护人同意的未成年人影像。']},
{title:'四、内容与知识产权',paragraphs:['产品名称、界面、程序及相关素材的权利归运营方或合法权利人所有。未经许可，不得复制、反向工程、批量抓取或用于训练其他模型。','你保留对合法上传内容的权利，并授权我们在提供本次服务所必要的范围内存储、处理、传输和生成结果。未经另行明确同意，我们不会将你的私人照片用于公开展示或广告宣传。']},
{title:'五、服务变更与中断',paragraphs:['因维护、网络、第三方人工智能服务、对象存储或不可抗力，服务可能暂时中断或产生失败结果。我们会在合理范围内恢复服务，但不承诺服务永不中断或所有结果均满足主观期待。']},
{title:'六、责任边界',paragraphs:['你基于 AI 建议作出的消费、造型或护理决定由你自行判断。因违法上传、侵犯他人肖像权、隐私权或知识产权产生的责任，由上传者承担。法律另有强制规定的，从其规定。']},
{title:'七、未成年人',paragraphs:['本服务仅面向年满 18 周岁的用户。用户上传照片前须主动确认已成年；若发现或接到通知证明相关信息属于未成年人，我们将停止处理并删除相关信息。']},
{title:'八、协议更新与联系',paragraphs:['我们可能因功能、法律或运营变化更新本协议。重大变更会通过产品页面等合理方式提示。隐私与账号相关请求，可发送至 moyuuuu@foxmail.com。']}
]
</script>
<style scoped src="../legal.scss"></style>
