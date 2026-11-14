<template>
  <view class="mirror-studio" :class="[{ 'dock-collapsed':!dockOpen, 'has-person':hasPerson, 'is-comparing':compare }, `frame-${framing}`]">
    <image class="room-image" :src="studioImages.room" mode="aspectFill"/><view class="room-shade"/>
    <view class="studio-header">
      <button tabindex="0" role="button" class="brand" aria-label="镜界工作台" @click="closePanel"><text>MIRRORA</text><text class="brand-divider">/</text><text class="brand-cn">镜界</text></button>
      <view class="mode-tabs glass" role="tablist" aria-label="编辑模式"><button :tabindex="(busy) ? -1 : 0" :aria-disabled="busy" v-for="tab in modes" :key="tab.id" role="tab" :aria-selected="mode===tab.id" :class="{active:mode===tab.id}" :disabled="busy" @click="setMode(tab.id)">{{tab.name}}</button></view>
      <view class="header-actions"><button tabindex="0" role="button" class="header-link" @click="openPanel('gallery')"><StudioIcon name="hanger"/><text>我的搭配</text></button><button tabindex="0" role="button" class="avatar-button" aria-label="账户设置" @click="openAccount"><image v-if="currentUser?.avatar" :src="currentUser.avatar" mode="aspectFill"/><StudioIcon v-else name="user"/></button></view>
    </view>

    <view v-if="!hasPerson" class="welcome-layer">
      <view class="welcome-copy"><text class="overline">A SPACE TO BE YOURSELF</text><view class="welcome-title">每一种你，<br/>都值得看见。</view><text class="welcome-subtitle">你的私人形象空间<br/>从一张照片，开始探索新的可能。</text></view>
      <view class="welcome-card glass">
        <view class="welcome-symbol"><StudioIcon name="sparkle" :size="32"/></view><text class="overline">YOUR PERSONAL MIRROR</text><view class="panel-title">创建我的形象</view><text class="muted">上传照片，在同一面镜子里<br/>尝试穿搭、发型与妆容。</text>
        <view class="upload-outline"><StudioIcon name="upload" :size="28"/><button tabindex="0" role="button" class="primary-button" :disabled="busy" @click="choosePerson">{{busy?status:'选择本人照片'}}<StudioIcon name="arrow"/></button><text class="small muted">上传后自动提取人物 · 试衣建议全身照</text></view>
        <UploadPhotoGuide/>
        <view class="consent-line"><button tabindex="0" role="button" class="check-box" :class="{checked:consent}" aria-label="确认照片授权与成年声明" @click="consent=!consent">{{consent?'✓':''}}</button><text>照片为本人或已获授权，人物已满 18 岁</text></view>
        <button tabindex="0" role="button" class="demo-link" @click="useDemo">先用示例体验<StudioIcon name="arrow" :size="16"/></button><text class="small muted">无需登录 · 不消耗生成额度</text>
      </view>
    </view>

    <template v-else>
      <view class="person-stage" :class="{ 'personal-stage':!isDemo }">
        <view v-if="isDemo" class="person-shadow"/>
        <view class="person-viewport">
          <view class="compare-result" :style="compare?{clipPath:`inset(0 0 0 ${comparePosition}%)`}:{}"><image class="person-image" :src="compare && comparisonPair ? comparisonPair.result : image" mode="aspectFit" @error="imageError"/></view>
          <view v-if="compare" class="compare-original" :style="{clipPath:`inset(0 ${100-comparePosition}% 0 0)`}"><image class="person-image" :src="comparisonPair?.original || preview?.original || original" mode="aspectFit"/></view>
          <view v-if="compare" class="compare-divider" :style="{left:`${comparePosition}%`}"><text>‹ ›</text></view>
          <view v-if="scanning" class="scan-line"/>
        </view>
        <view v-if="compare" class="compare-captions"><text>人物底图</text><text>当前效果 · 对齐预览</text></view>
      </view>
      <view class="look-meta"><text class="overline">{{ isDemo?'DEMO COLLECTION':'YOUR PERSONAL LOOK' }}</text><view>{{preview?.name || '我的形象'}}</view><text class="small muted">{{ isDemo?'示例素材 · 非实时 AI 生成':'个人照片 · 仅当前账户可见' }}</text></view>
      <view class="current-look glass">
        <view class="card-heading"><button tabindex="0" role="button" class="text-button" @click="panel='lookState'">当前搭配 · 完整造型</button><button :tabindex="(busy) ? -1 : 0" :aria-disabled="busy" role="button" class="icon-button" aria-label="更换本人照片" :disabled="busy" @click="panel='create'"><StudioIcon name="user" :size="16"/></button></view>
        <view class="current-items"><view v-for="item in currentItems" :key="item.id"><view class="current-thumb"><image v-if="item.image" :src="item.image" mode="aspectFill"/><StudioIcon v-else :name="item.icon || 'sparkle'" :size="30"/></view><text>{{item.name}}</text></view></view>
        <button tabindex="0" role="button" class="text-button advice-link" @click="panel='advice'">查看造型建议<StudioIcon name="arrow" :size="14"/></button>
      </view>
      <view class="mirror-tools glass"><button role="button" tabindex="0" v-if="!isDemo && (photoSource || personBase)" :disabled="busy" aria-label="拍摄校正" @click="openPhotoAdjust"><StudioIcon name="zoom"/><text>校正</text></button><button tabindex="0" role="button" :class="{active:compare}" aria-label="原图对比" @click="toggleComparison" :disabled="comparisonLoading"><StudioIcon name="compare"/><text>{{comparisonLoading ? '对齐中' : '对比'}}</text></button><button tabindex="0" role="button" :class="{active:zoomed}" aria-label="切换取景范围" @click="zoomed=!zoomed"><StudioIcon name="zoom"/><text>{{framing==='full'?'全身':framing==='half'?'半身':'面部'}}</text></button><button :tabindex="(busy) ? -1 : 0" :aria-disabled="busy" role="button" :disabled="busy" @click="panel='confirmReset'"><StudioIcon name="reset"/><text>重置</text></button></view>
      <view class="look-actions"><button tabindex="0" role="button" class="text-button" @click="openPanel('history')"><StudioIcon name="history" :size="17"/>历史版本</button><button :tabindex="(busy) ? -1 : 0" :aria-disabled="busy" role="button" class="outline-button" :disabled="busy" @click="savedName=current?.name || '';panel='save'"><StudioIcon name="save" :size="17"/>保存搭配</button></view>
      <view v-if="busy" class="generation-status glass" role="status"><view class="spinner"/><text>{{status}}</text></view>
      <view v-if="failure" class="failure-notice glass" role="alert"><StudioIcon name="info"/><view><text>本次调整未完成</text><text class="small muted">{{failure}}</text></view><button tabindex="0" role="button" class="text-button" @click="generate">重试</button><button tabindex="0" role="button" class="icon-button" aria-label="关闭错误提示" @click="failure=''">×</button></view>
    </template>

    <view class="bottom-workspace">
      <view v-if="compare && hasPerson" class="compare-control glass"><text>原图</text><slider :value="comparePosition" :min="0" :max="100" activeColor="#e4c8a0" backgroundColor="#ffffff30" :block-size="18" @changing="comparePosition=$event.detail.value" @change="comparePosition=$event.detail.value"/><text>效果</text><text class="compare-hint">共同取景 · 按面部对齐</text><button tabindex="0" role="button" class="text-button" @click="compare=false">返回编辑</button></view>
      <view v-else-if="hasPerson" class="refine-wrap">
        <view class="refine-bar glass"><view class="refine-label"><StudioIcon name="sparkle"/><text>微调想法</text></view><input v-model="note" :maxlength="200" :disabled="busy" :placeholder="placeholders[mode]" placeholder-class="studio-placeholder" aria-label="微调描述" confirm-type="send" @confirm="generate"/><button :tabindex="(busy) ? -1 : 0" :aria-disabled="busy" role="button" class="primary-button" :disabled="busy" @click="generate">{{busy?'处理中':isDemo?'预览方案':mode==='accessories'?'应用方案':'生成效果'}}<StudioIcon name="arrow" :size="18"/></button></view>
        <text class="generation-disclaimer">{{isDemo?'示例只展示预置效果，文字微调不调用 AI':['tryon','outfit','accessories'].includes(mode)?'保护脸部与已有妆容 · 仅调整衣服和面部以外的配饰':'基于当前选中版本继续编辑 · 可随时恢复原图'}}</text>
      </view>
      <view class="wardrobe glass" :class="{collapsed:!dockOpen}">
        <view class="wardrobe-header"><button tabindex="0" role="button" class="wardrobe-title" @click="dockOpen=!dockOpen"><StudioIcon :name="mode==='tryon'?'hanger':'sparkle'"/><text>{{shelfTitle}}</text><text class="count">{{materials.length.toString().padStart(2,'0')}}</text><StudioIcon name="chevron" :size="16"/></button>
          <scroll-view v-if="dockOpen" class="category-scroll" scroll-x><view class="categories"><button tabindex="0" role="button" v-for="category in categories" :key="category" :class="{active:filter===category}" @click="filter=category">{{category}}</button></view></scroll-view>
          <view v-if="dockOpen && tones[mode]" class="tone-swatches"><text>{{mode==='hair'?'发色':'唇色'}}</text><button v-for="tone in tones[mode]" :key="tone.name" role="button" :tabindex="busy?-1:0" :aria-label="`选择${tone.name}`" :aria-pressed="selections[`${mode}-tone`]?.includes(tone.name) || false" :disabled="busy" :style="{background:tone.color}" :class="{selected:selections[`${mode}-tone`]?.includes(tone.name)}" @click="selections[`${mode}-tone`]=selections[`${mode}-tone`]?.includes(tone.name)?[]:[tone.name];notify(`已选择${tone.name}，生成后查看效果`)"><text v-if="selections[`${mode}-tone`]?.includes(tone.name)">✓</text></button></view>
          <button :tabindex="(busy) ? -1 : 0" :aria-disabled="busy" role="button" v-if="mode==='tryon'" class="upload-button outline-button" :disabled="busy" @click="chooseGarment"><StudioIcon name="upload" :size="16"/><text>上传服装</text></button>
          <button tabindex="0" role="button" v-else class="upload-button text-button" @click="panel='advice'">造型建议<StudioIcon name="arrow" :size="16"/></button>
        </view>
        <scroll-view v-if="dockOpen" class="material-scroll" scroll-x><view class="material-row">
          <button :tabindex="(busy) ? -1 : 0" :aria-disabled="busy" role="button" v-for="item in filtered" :key="item.id" class="material-card" :class="{selected:selections[mode]?.includes(item.id), 'uploaded-card':item.local, 'person-card':item.id==='ivory'||item.id==='weekend'}" :disabled="busy" :aria-label="`选择${item.name}`" @click="select(item)">
            <image v-if="item.image" :src="item.image" :mode="item.local?'aspectFit':'aspectFill'"/><view v-else class="material-illustration"><StudioIcon :name="item.icon || 'sparkle'" :size="56"/></view><text v-if="selections[mode]?.includes(item.id)" class="selection-check">✓</text><text v-if="!item.local" class="sample-label">{{mode==='tryon'?'穿搭方案':mode==='accessories'?'示意':'灵感'}}</text><view class="material-caption"><text class="color-dot"/><text>{{item.name}}</text></view>
          </button>
          <view v-if="!filtered.length" class="shelf-empty">还没有素材，上传一件喜欢的衣服吧。</view>
        </view></scroll-view>
      </view>
    </view>
    <view class="studio-footer"><text>PRIVATE STYLING SPACE</text><button tabindex="0" role="button" @click="openLegal('privacy')">隐私与使用说明</button></view>
    <view v-if="message" class="studio-toast glass" role="status"><StudioIcon name="check" :size="16"/><text>{{message}}</text></view>

    <view v-if="panel || loginRequested" class="overlay" :class="{'drawer-overlay':isDrawer && !loginRequested}" @click.self="dismiss">
      <view class="overlay-scrim" @click="dismiss"/>
      <view class="overlay-panel glass" :class="{drawer:isDrawer && !loginRequested, wide:['gallery','baseConfirm'].includes(panel) && !loginRequested, 'legal-panel':panel==='legal', 'login-panel':loginRequested && panel!=='legal'}" role="dialog" aria-modal="true" :aria-label="dialogTitle" tabindex="-1">
        <button tabindex="0" role="button" class="close-button icon-button" aria-label="关闭面板" @click="dismiss"><StudioIcon name="close"/></button>
        <StudioAccount v-if="loginRequested" v-show="panel!=='legal'" kind="login" @legal="openLegal" @done="accountDone"/>
        <template v-if="!loginRequested || panel==='legal'">
        <template v-if="panel==='create'">
          <text class="overline">YOUR PERSONAL MIRROR</text><view class="panel-title">{{hasPerson?'更换我的形象':'创建我的形象'}}</view><text class="muted">新照片会开启新的编辑会话。保存的搭配仍可找回。</text><UploadPhotoGuide/>
          <view class="upload-outline"><StudioIcon name="upload" :size="30"/><button tabindex="0" role="button" class="primary-button" :disabled="busy" @click="choosePerson">{{busy?status:'选择本人照片'}}</button><text class="small muted">JPG / PNG / WebP · 每张不超过 5 MB</text></view>
          <view class="consent-line"><button tabindex="0" role="button" class="check-box" :class="{checked:consent}" aria-label="确认照片授权与成年声明" @click="consent=!consent">{{consent?'✓':''}}</button><text>我确认照片为本人或已获授权，人物已满 18 岁，并同意用于本次 AI 形象处理。</text></view>
          <button tabindex="0" role="button" v-if="hasPerson && consent" class="outline-button full-button" @click="closePanel">保留当前照片并继续</button><button tabindex="0" role="button" class="demo-link" @click="useDemo">使用示例人物体验<StudioIcon name="arrow" :size="16"/></button>
        </template>
        <template v-else-if="panel==='baseConfirm' && candidateBase">
          <text class="overline">YOUR PERSONAL FOUNDATION</text><view class="panel-title">确认我的人物底图</view>
          <text class="muted">检查脸部、身材比例与人物边缘。确认后，以这张底图开始新的搭配。</text>
          <text v-if="candidateBase.body_status==='body_frame_incomplete'" class="form-error">这张照片没有拍全身体。仍可确认用于发型、妆容；试衣与纠姿请重拍一张从头到鞋完整入镜的照片。</text>
          <text v-else-if="candidateBase.body_status==='body_limbs_occluded'" class="form-error">部分肢体被遮挡或不清晰。试衣与纠姿建议双臂自然下垂、双腿清楚可见，避免插兜或遮挡。</text>
          <view class="base-comparison"><view><image :src="candidateBase.original_url" mode="aspectFit"/><text>上传原图</text></view><view><image :src="candidateBase.display_url" mode="aspectFit"/><text>工作台人物</text></view></view>
          <text class="small muted">{{candidateBase.preparation==='pose'?'这是 AI 姿态候选，不能还原被遮挡的真实体型。请仔细核对；确认后将以新底图开始搭配。':'本次仅提取人物并做拍摄校正，未进行 AI 纠姿或重塑体型。原图会独立保留。'}}</text>
          <view class="consent-line"><button tabindex="0" role="checkbox" :aria-checked="baseChecked" class="check-box" :class="{checked:baseChecked}" :disabled="busy" aria-label="确认底图中的脸部与体型" @click="baseChecked=!baseChecked">{{baseChecked?'✓':''}}</button><text>脸部与体型符合原照片，人物边缘可以接受</text></view>
          <view class="dialog-actions"><button tabindex="0" role="button" class="outline-button" :disabled="busy" @click="closePanel">取消，保留当前工作台</button><button tabindex="0" role="button" class="primary-button" :disabled="busy || !baseChecked" :aria-disabled="busy || !baseChecked" @click="acceptBase">{{busy?'正在确认…':'确认并进入工作台'}}</button></view>
        </template>
        <template v-else-if="panel==='lookState'">
          <text class="overline">YOUR COMPLETE LOOK</text><view class="panel-title">完整造型</view><text class="muted">这里记录当前成功版本的搭配。新的选择与微调在生成成功后保存；恢复历史版本时一起恢复。</text>
          <view v-for="slot in lookRows" :key="slot.id" class="advice-section look-state-row"><view>{{slot.label}}</view><text>{{slot.summary}}</text><text v-if="slot.tone">色调：{{slot.tone}}</text><text v-for="(idea,index) in slot.notes" :key="index">{{index+1}}. {{idea}}</text></view>
          <view v-if="personBase" class="advice-section"><view>人物底图 · 已确认</view><image class="base-thumbnail" :src="personBase.display_url" mode="aspectFit"/><text>搭配以这张底图为身份参考；重新校正后需要再次确认。</text></view>
          <text v-else class="small muted">旧版记录未保存完整造型，只能恢复当时已有的信息。</text>
        </template>
        <template v-else-if="panel==='photoAdjust'">
          <text class="overline">PHOTO ADJUSTMENT</text><view class="panel-title">拍摄校正</view>
          <text class="small muted">校正拍歪与轻微俯仰透视，保留原照片。先预览再应用；应用后从此形象开始新的搭配。</text>
          <view class="correction-preview"><image :src="adjustedPhoto" mode="aspectFit"/></view>
          <view class="correction-setting"><text>水平旋转 {{rotation}}°</text><slider :value="rotation" :min="-12" :max="12" :step="0.5" :disabled="busy" activeColor="#c7ad88" :block-size="18" @change="rotation=Number($event.detail.value)"/></view>
          <view class="correction-setting"><text>俯仰透视 {{perspective}}</text><slider :value="perspective" :min="-20" :max="20" :disabled="busy" activeColor="#c7ad88" :block-size="18" @change="perspective=Number($event.detail.value)"/><text class="small muted">负值收窄下方，正值收窄上方；以脸和身材自然为准。</text></view>
          <view class="consent-line"><button role="button" tabindex="0" class="check-box" :class="{checked:autoCorrect}" :disabled="busy" aria-label="自动扶正" @click="autoCorrect=!autoCorrect">{{autoCorrect?'✓':''}}</button><text>根据可靠的背景竖线自动扶正</text></view>
          <view v-if="personBase && !isDemo" class="pose-option"><text class="small muted">AI 自然站姿候选：需清晰全身照片，会消耗扣子积分。保持原衣着，生成后由你确认；不会自动应用。</text><button class="outline-button" :disabled="busy" @click="preparePose">{{busy?status:'生成站姿候选'}}</button></view><view class="row-actions"><button role="button" tabindex="0" class="outline-button" :disabled="busy" @click="rotation=0;perspective=0;autoCorrect=false">取消校正</button><button role="button" tabindex="0" class="outline-button" :disabled="busy" @click="previewCorrection">{{busy?status:'预览校正'}}</button><button role="button" tabindex="0" class="primary-button" :disabled="busy || !correctionReady" :aria-disabled="busy || !correctionReady" @click="acceptCorrection">应用形象</button></view>
          <text v-if="!correctionReady" class="small muted">参数已改变，请先预览。预览图会在处理完成后更新。</text>
          <text v-if="failure" class="small" role="alert">{{failure}}</text>
        </template>
        <template v-else-if="panel==='history'">
          <text class="overline">YOUR STYLE JOURNEY</text><view class="panel-title">历史版本</view><text class="muted small">本次编辑版本可预览、恢复；真实生成记录来自你的账户。</text>
          <view class="panel-subtitle">本次会话</view><view v-if="!versions.length" class="empty-state">从创建形象开始，记录你的每一次尝试。</view>
          <view v-for="version in versions" :key="version.id" class="version-row" :class="{selected:(previewId || current?.id)===version.id}"><image :src="version.image" mode="aspectFit"/><view><text>{{version.name}}</text><text class="small muted">{{version.demo?'示例方案':formatDate(version.created)}}</text><text v-if="version.note" class="small one-line">{{version.note}}</text><view class="row-actions"><button tabindex="0" role="button" class="text-button" @click="previewId=version.id">预览</button><button :tabindex="(busy) ? -1 : 0" :aria-disabled="busy" role="button" class="text-button" :disabled="busy" @click="restore(version)">恢复此版本</button></view></view></view>
          <view class="panel-subtitle">账户生成记录</view><button tabindex="0" role="button" v-if="!isLoggedIn()" class="outline-button full-button" @click="openLogin()">登录查看历史记录</button>
          <template v-else><view v-if="recordsLoading" class="empty-state">正在读取…</view><view v-if="recordsError" class="form-error">{{recordsError}}<button tabindex="0" role="button" class="text-button" @click="loadRecords(recordsPage)">重新加载</button></view><view v-if="!recordsLoading && !recordsError && !records.length" class="empty-state">还没有生成记录</view><button :tabindex="(busy) ? -1 : 0" :aria-disabled="busy" role="button" v-for="record in records" :key="record.id" class="record-row" :disabled="busy" @click="openRecord(record.id)"><view><text>{{record.module==='pose'?'站姿候选':(modeNames[record.module as Mode] || '形象')+'方案'}}</text><text class="small muted">{{formatDate(record.created_at)}}</text></view><text class="status-pill">{{statusNames[record.status]}}</text><StudioIcon name="arrow" :size="16"/></button><view v-if="recordsTotal>8" class="pagination"><button :tabindex="(recordsPage===1 || recordsLoading) ? -1 : 0" :aria-disabled="recordsPage===1 || recordsLoading" role="button" :disabled="recordsPage===1 || recordsLoading" @click="loadRecords(recordsPage-1)">上一页</button><text>{{recordsPage}} / {{Math.ceil(recordsTotal/8)}}</text><button tabindex="0" role="button" :disabled="recordsPage*8>=recordsTotal || recordsLoading" @click="loadRecords(recordsPage+1)">下一页</button></view></template>
        </template>
        <template v-else-if="panel==='gallery'">
          <text class="overline">A COLLECTION OF YOU</text><view class="panel-title">我的搭配</view><text class="muted">保存喜欢的造型，随时回来继续调整。</text><view class="gallery-toolbar"><text class="small">{{saved.length}} 套搭配 · 示例保存在本机，个人搭配保留于本次会话</text><button :tabindex="(busy) ? -1 : 0" :aria-disabled="busy" role="button" class="outline-button" :disabled="busy" @click="panel='create'">＋ 新建形象</button></view>
          <view v-if="!saved.length" class="empty-state gallery-empty"><StudioIcon name="hanger" :size="44"/><view>你的风格收藏，从第一套开始。</view><button tabindex="0" role="button" class="primary-button" @click="closePanel">回到镜面</button></view>
          <view class="gallery-grid"><view v-for="look in saved" :key="look.id" class="saved-card"><view class="saved-preview"><image :src="look.image" mode="aspectFit"/><text class="sample-label">{{look.demo?'示例':'本次会话'}}</text></view><view class="saved-info"><text>{{look.name}}</text><text class="small muted">{{modeNames[look.mode]}}</text><view class="row-actions"><button :tabindex="(busy) ? -1 : 0" :aria-disabled="busy" role="button" class="primary-button" :disabled="busy" @click="restore(look)">继续编辑<StudioIcon name="arrow" :size="14"/></button><button tabindex="0" role="button" class="icon-button" aria-label="删除已保存搭配" @click="deleteLook(look.id)"><StudioIcon name="trash" :size="17"/></button></view></view></view></view>
        </template>
        <StudioAccount v-else-if="panel==='account'" kind="account" @legal="openLegal" @done="accountDone"/>
        <template v-else-if="panel==='advice'">
          <text class="overline">A LITTLE INSPIRATION</text><view class="panel-title">当前造型建议</view><view class="advice-preview"><image v-if="hasPerson" :src="image" mode="aspectFit"/><view><text>{{current?.name || '探索你的风格'}}</text><text class="small muted">{{current?.analysis?'来自本次生成结果':'以下为通用搭配灵感'}}</text></view></view>
          <rich-text v-if="current?.analysis" class="analysis-rich" :nodes="renderMarkdown(current.analysis)"/>
          <template v-else><view class="advice-section"><view>搭配思路</view><text>从一件喜欢的单品出发，用相近色系和简洁轮廓，让整体更协调。</text></view><view class="advice-section"><view>可以尝试</view><text>先调整一个细节，再对比原图。保留让自己感觉舒适的部分。</text></view><view class="advice-section"><view>把想法说出来</view><text>描述具体位置、颜色或长度，通常比“更好看一点”更清楚。</text></view></template>
          <view class="suggestion-chips"><button tabindex="0" role="button" v-for="idea in suggestions" :key="idea" @click="note=idea;closePanel();notify('已填入微调框，确认后再生成')">{{idea}}<StudioIcon name="plus" :size="14"/></button></view>
          <view class="panel-subtitle">其他形象建议</view><button :tabindex="(busy) ? -1 : 0" :aria-disabled="busy" role="button" class="setting-row" :disabled="busy" @click="setMode('outfit');closePanel()">穿搭风格建议<StudioIcon name="arrow" :size="16"/></button><button :tabindex="(busy) ? -1 : 0" :aria-disabled="busy" role="button" class="setting-row" :disabled="busy" @click="setMode('skin');closePanel()">肤质与日常护理<StudioIcon name="arrow" :size="16"/></button>
          <view v-if="!isDemo" class="form-field"><text>呈现偏好</text><view class="preference-pills"><button tabindex="0" role="button" v-for="value in ['不限定','男','女','中性']" :key="value" :class="{active:presentation===value}" @click="presentation=value">{{value}}</button></view></view>
          <view v-if="isDemo" class="demo-settings"><text class="small muted">交互验收</text><button tabindex="0" role="button" class="text-button" @click="demoFail=true;closePanel();notify('下一次预览将演示失败与重试')">演示一次生成失败</button></view>
        </template>
        <template v-else-if="panel==='legal'">
          <text class="overline">TRUST & PRIVACY</text><view class="panel-title">{{legalType==='privacy'?'隐私政策':'用户协议'}}</view><view class="segmented"><button tabindex="0" role="button" :class="{active:legalType==='agreement'}" @click="legalType='agreement'">用户协议</button><button tabindex="0" role="button" :class="{active:legalType==='privacy'}" @click="legalType='privacy'">隐私政策</button></view><text class="muted small">更新及生效日期：2026 年 9 月 29 日</text>
          <view class="legal-body"><view v-for="section in legalSections" :key="section.title"><view class="panel-subtitle">{{section.title}}</view><text v-for="paragraph in section.paragraphs" :key="paragraph">{{paragraph}}</text></view></view>
        </template>
        <template v-else-if="panel==='save'">
          <text class="overline">KEEP THIS MOMENT</text><view class="panel-title">收藏这一次的自己</view><view class="save-preview"><image :src="image" mode="aspectFit"/></view><view class="form-field"><text>搭配名称</text><input v-model="savedName" maxlength="30" placeholder="给这套搭配起个名字" @confirm="saveLook"/></view><text class="muted small">{{isDemo?'示例搭配保存在当前设备。':'搭配组合保留于本次会话，生成结果可在账户历史中找回。'}}</text><button tabindex="0" role="button" class="primary-button full-button" @click="saveLook"><StudioIcon name="save"/>保存搭配</button><button :tabindex="(downloading) ? -1 : 0" :aria-disabled="downloading" role="button" class="outline-button full-button" :disabled="downloading" @click="downloadCurrent"><StudioIcon name="download"/>{{downloading?'正在准备…':'下载效果图片'}}</button>
        </template>
        <template v-else-if="panel==='confirmReset'"><text class="overline">BACK TO THE BEGINNING</text><view class="panel-title">回到原始形象？</view><text class="muted">已生成的版本仍保留在本次历史中，可以随时恢复。</text><view class="dialog-actions"><button tabindex="0" role="button" class="outline-button" @click="closePanel">继续编辑</button><button tabindex="0" role="button" class="primary-button" @click="reset">恢复原图</button></view></template>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue'
import { currentUser, isLoggedIn, loginRequested, openLogin } from '../auth'
import { errorMessage, getConsultation, getComparison } from '../api'
import { downloadInBrowser, openImageInBrowser } from '../download'
import { renderMarkdown } from '../markdown'
import { useStudio, type Panel } from '../studio/useStudio'
import { modes, catalog, modeNames, placeholders, tones, type Mode, type Material } from '../studio/catalog'
import { studioImages } from '../studio/assets'
import { agreementSections, privacySections } from '../studio/legal'
import StudioIcon from './StudioIcon.vue'
import StudioAccount from './StudioAccount.vue'
import UploadPhotoGuide from './UploadPhotoGuide.vue'
const props=defineProps<{query?:Record<string,string|undefined>}>()
const studio=useStudio()
const {preparePose,personBase,candidateBase,baseChecked,acceptBase,appliedLook,photoSource,adjustedPhoto,rotation,perspective,autoCorrect,correctionReady,openPhotoAdjust,previewCorrection,acceptCorrection,mode,panel,source,original,consent,note,filter,selections,versions,saved,current,compare,comparePosition,dockOpen,zoomed,busy,status,failure,message,scanning,records,recordsPage,recordsTotal,recordsLoading,recordsError,savedName,demoFail,previewId,presentation,materials,categories,filtered,preview,image,hasPerson,isDemo,framing,notify,closePanel,setMode,select,useDemo,choosePerson,chooseGarment,generate,restore,reset,saveLook,deleteLook,loadRecords,openRecord}=studio
const legalType=ref<'agreement'|'privacy'>('agreement'), previousPanel=ref<Panel>(''), downloading=ref(false)
const legalSections=computed(()=>legalType.value==='privacy'?privacySections:agreementSections)
const isDrawer=computed(()=>['history','account','advice','lookState'].includes(panel.value))
const dialogTitle=computed(()=>loginRequested.value && panel.value!=='legal'?'登录镜界':({create:'创建我的形象',history:'历史版本',gallery:'我的搭配',account:'账户设置',advice:'当前造型建议',legal:'协议与隐私',save:'保存搭配',photoAdjust:'拍摄校正',baseConfirm:'确认人物底图',lookState:'完整造型',confirmReset:'恢复原图','':''}[panel.value]))
const shelfTitle=computed(()=>({tryon:'我的衣橱',hair:'发型灵感',makeup:'妆容方案',accessories:'配饰搭配',outfit:'穿搭灵感',skin:'护理方向'}[mode.value]))
const suggestions=computed(()=>mode.value==='hair'?['刘海轻薄一点，保留长度','希望更容易日常打理']:mode.value==='makeup'?['唇色淡一点，眼妆更自然','想尝试温柔的豆沙色']:['外套宽松一点，保留内搭','整体色调更简约一些'])
const lookRows=computed(()=>[{id:'tryon',label:'服装'},{id:'hair',label:'发型'},{id:'makeup',label:'妆容'},{id:'accessories',label:'配饰'}].map(row=>{const slot=appliedLook.value.slots[row.id];return {...row,summary:slot?slot.items.map(x=>x.name).join('、')||'未选择预设，按微调要求处理':'保持人物底图',tone:slot?.tone||'',notes:slot?.refinements||[]}}))
const currentItems=computed(()=>{
  const selection=current.value?.selections || selections
  return ['tryon','hair','accessories'].map(key=>{
    const items=key==='tryon'?studio.uploads.value.concat(catalog.tryon):catalog[key as Mode]
    return items.find(x=>selection[key]?.includes(x.id))
  }).filter(Boolean).slice(0,3) as Material[]
})
const statusNames={queued:'排队中',running:'生成中',succeeded:'已完成',failed:'未完成'}
const formatDate=(date:string)=>new Date(date).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
onMounted(()=>{if(!props.query?.id && !props.query?.panel)void studio.resumeLatest()})
function openPanel(value:Panel){panel.value=value;if(value==='history')void loadRecords()}
function openAccount(){if(isLoggedIn())panel.value='account';else openLogin()}
function openLegal(type:'agreement'|'privacy'){previousPanel.value=panel.value;legalType.value=type;panel.value='legal'}
function dismiss(){if(panel.value==='legal'){panel.value=previousPanel.value;previousPanel.value='';return}if(loginRequested.value){loginRequested.value=false;return}closePanel()}
function accountDone(text:string){notify(text);if(!loginRequested.value)closePanel();if(props.query?.id && !current.value && isLoggedIn())void openRecord(props.query.id)}
const comparisonPair=ref<{original:string;result:string}>()
const comparisonLoading=ref(false)
let comparisonTicket=0
watch([image,()=>preview.value?.id],()=>{comparisonTicket++;comparisonLoading.value=false;comparisonPair.value=undefined;compare.value=false})
async function toggleComparison(){
  if(compare.value){compare.value=false;return}
  if(comparisonLoading.value)return
  const version=preview.value
  if(!version || version.image===version.original){comparisonPair.value=undefined;compare.value=true;return}
  // Example images and older results have no trusted shared canvas.
  if(!version.recordId){notify('这组图片没有可核对的对齐信息，暂不支持滑动对比');return}
  const ticket=++comparisonTicket;comparisonLoading.value=true
  try{
    const pair=await getComparison(version.recordId)
    if(ticket!==comparisonTicket)return
    comparisonPair.value=pair;compare.value=true
  }catch{if(ticket===comparisonTicket)notify('这组照片无法可靠对齐，暂不显示滑动对比。可在历史版本中分别查看。')}
  finally{if(ticket===comparisonTicket)comparisonLoading.value=false}
}
function imageError(){notify('图片暂时无法显示，请检查网络；历史图片可重新打开以刷新链接')}
async function downloadCurrent(){
  if(!current.value||downloading.value)return
  downloading.value=true
  try{
    let url=current.value.image
    if(current.value.recordId){const record=await getConsultation(current.value.recordId);if(!record.result_image_url)throw new Error('missing_image');url=record.result_image_url}
    // #ifdef H5
    try{await downloadInBrowser(url,'mirrora-look.png')}catch{openImageInBrowser(url);notify('已打开原图，可手动保存')}
    // #endif
    // #ifndef H5
    const file=await new Promise<string>((resolve,reject)=>uni.downloadFile({url,success:r=>r.statusCode===200?resolve(r.tempFilePath):reject(new Error('download_failed')),fail:reject}))
    await new Promise<void>((resolve,reject)=>uni.saveImageToPhotosAlbum({filePath:file,success:()=>resolve(),fail:reject}))
    notify('图片已保存到相册')
    // #endif
  }catch(e){notify(errorMessage(e,'图片保存失败，请重试'))}finally{downloading.value=false}
}
watch(()=>props.query,query=>{
  if(!query)return
  if(query.mode && Object.prototype.hasOwnProperty.call(catalog,query.mode))setMode(query.mode as Mode)
  if(query.panel==='login')openLogin()
  else if(['history','gallery','account','advice','create'].includes(query.panel || ''))openPanel(query.panel as Panel)
  else if(query.panel==='privacy'||query.panel==='agreement')openLegal(query.panel)
  if(query.id)void openRecord(query.id)
},{immediate:true})
// #ifdef H5
let previousFocus:HTMLElement|null=null
let inputObserver:MutationObserver|undefined
function syncInputLabels(){
  document.querySelectorAll<HTMLInputElement>('.mirror-studio input').forEach(input=>{
    const label=input.closest('uni-input')?.getAttribute('aria-label') || input.closest('.form-field')?.querySelector('uni-text')?.textContent?.trim()
    if(label)input.setAttribute('aria-label',label)
  })
}
onMounted(()=>{void nextTick(syncInputLabels);inputObserver=new MutationObserver(syncInputLabels);const root=document.querySelector('.mirror-studio');if(root)inputObserver.observe(root,{childList:true,subtree:true})})
onUnmounted(()=>inputObserver?.disconnect())
onUpdated(()=>{void nextTick(syncInputLabels)})
watch(()=>Boolean(panel.value||loginRequested.value),async open=>{
  if(open){previousFocus=document.activeElement as HTMLElement;await nextTick();document.querySelector<HTMLElement>('.overlay-panel')?.focus()}
  else previousFocus?.focus?.()
})
function keyboard(event:KeyboardEvent){
  const target = event.target as HTMLElement
  const button = target.closest('uni-button') as HTMLElement | null
  if (button && (event.key==='Enter' || event.key===' ')) {
    event.preventDefault()
    if (button.getAttribute('aria-disabled') !== 'true' && !button.hasAttribute('disabled')) button.click()
    return
  }
  if(!panel.value&&!loginRequested.value)return
  if(event.key==='Escape'){event.preventDefault();dismiss()}
  if(event.key==='Tab'){
    const dialog=document.querySelector('.overlay-panel')
    const nodes=Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),[tabindex="0"]')||[]).filter(x=>x.getClientRects().length)
    const first=nodes[0],last=nodes.at(-1)
    if(!first){event.preventDefault();return}
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){event.preventDefault();last?.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
}
onMounted(()=>document.addEventListener('keydown',keyboard))
onUnmounted(()=>document.removeEventListener('keydown',keyboard))
// #endif
defineExpose({suspend:studio.suspend,resume:studio.resume})
</script>


<style scoped>
.base-comparison{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:22px 0}.base-comparison>view{display:flex;flex-direction:column;align-items:center;gap:10px;background:rgba(255,255,255,.12);border-radius:16px;padding:12px}.base-comparison image{width:100%;height:38vh;min-height:200px;max-height:420px}.base-thumbnail{width:100%;height:200px;margin:12px 0}
</style>

<style scoped>
.look-state-row > text { display: block; margin-top: 8px; line-height: 1.6; }
.pose-option { margin: 18px 0; padding: 16px; border: 1px solid rgba(255,255,255,.2); border-radius: 14px; }
.pose-option > text { display: block; line-height: 1.6; margin-bottom: 12px; }
</style>
