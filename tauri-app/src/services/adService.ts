/**
 * 广告服务
 * 根据接入文档：api/接入文档.md - 3. 鲲穹软件广告功能接口
 * 接口文档：https://api-web.kunqiongai.com/soft_desktop/get_adv
 */

const API_BASE_URL = "https://api-web.kunqiongai.com";

// 软件编号（根据文档说明，可从 https://image.kunqiongai.com/soft_list.html 获取）
const SOFT_NUMBER = "10033";

// 广告位置（根据文档约定，前缀为 adv_position_，如 adv_position_01）
const ADV_POSITION = "adv_position_01";

/**
 * 广告数据接口
 * 对应文档中的响应 data 数组项
 */
export interface AdData {
  soft_number: number;      // 软件编号
  adv_position: string;     // 广告位置（如 adv_position_01）
  adv_url: string;           // 广告资源地址
  target_url: string;       // 广告对应跳转地址
  width: number;             // 广告宽度（像素）
  height: number;            // 广告高度（像素）
}

/**
 * 广告接口响应格式
 * 对应文档中的响应示例
 */
interface AdResponse {
  code: number;              // 状态值(1成功,其他值失败)
  msg: string;               // 消息描述
  time: number;              // 时间戳
  data: AdData[];            // 广告数据数组
}

export const adService = {
  /**
   * 获取广告数据
   * 
   * 接口文档：https://api-web.kunqiongai.com/soft_desktop/get_adv
   * 请求方式：POST
   * Content-Type: application/x-www-form-urlencoded
   * 
   * 请求参数：
   * - soft_number: 软件编号（string，必填）
   * - adv_position: 广告位置（string，必填，前缀 "adv_position_"）
   * 
   * 响应格式：
   * - code: 1 表示成功，其他值表示失败
   * - data: 广告数据数组，返回第一个广告
   * 
   * @param advPosition 广告位置，默认为 adv_position_01
   * @param retries 重试次数，默认为 3
   * @param timeout 超时时间（毫秒），默认为 10000
   * @returns 广告数据，失败时返回 null
   */
  async getAd(
    advPosition: string = ADV_POSITION,
    retries: number = 3,
    timeout: number = 10000
  ): Promise<AdData | null> {
    // 构造请求参数（根据文档要求使用 urlencoded 格式）
    const formData = new URLSearchParams();
    formData.append('soft_number', SOFT_NUMBER);  // 软件编号（string 类型）
    formData.append('adv_position', advPosition); // 广告位置

    // 创建带超时的 fetch 请求
    const fetchWithTimeout = async (url: string, options: RequestInit): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    // 重试逻辑
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/soft_desktop/get_adv`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        // 检查响应状态
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: AdResponse = await response.json();

        // 根据文档：code=1 表示成功，其他值表示失败
        if (result.code === 1 && result.data && result.data.length > 0) {
          // 返回第一个广告（data 是数组）
          return result.data[0];
        }

        // 如果返回了数据但 code 不是 1，记录错误但不重试（这是业务逻辑错误）
        if (result.code !== 1) {
          console.warn(`广告接口返回错误: code=${result.code}, msg=${result.msg || '未知错误'}`);
          return null;
        }

        // code=1 但没有数据，返回 null
        return null;
      } catch (error) {
        const isLastAttempt = attempt === retries;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // 如果是代理错误或网络错误，尝试重试
        const isNetworkError = 
          errorMessage.includes('PROXY') || 
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('aborted') ||
          errorMessage.includes('ERR_PROXY') ||
          errorMessage.includes('ERR_CONNECTION');
        
        if (isNetworkError) {
          if (isLastAttempt) {
            console.error(`[广告服务] 获取失败（已重试 ${retries} 次）:`, errorMessage);
            console.error(`[广告服务] 提示: 请检查网络连接或代理设置`);
            return null;
          } else {
            // 指数退避：第1次重试等待1秒，第2次等待2秒，第3次等待3秒
            const delay = attempt * 1000;
            console.warn(`[广告服务] 获取失败，${delay}ms 后重试 (${attempt}/${retries}):`, errorMessage);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          // 其他错误（如 JSON 解析错误、HTTP 错误等），不重试
          console.error('[广告服务] 请求错误（不重试）:', error);
          return null;
        }
      }
    }

    return null;
  },
};
