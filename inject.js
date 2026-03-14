// [WebSocket.send Hook 腳本]
(function() {
    // 備份原生的 WebSocket send 方法
    const originalSend = WebSocket.prototype.send;

    // 覆寫 prototype 的 send 方法，這樣所有已建立和未來的 WebSocket 實例都會被攔截
    WebSocket.prototype.send = function(data) {
        console.log("=== [Hook] WebSocket.send Intercepted ===");
        
        try {
            if (typeof data === 'string') {
                console.log("Text Data:", data);
            } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data) || data instanceof Blob) {
                // 修正：加入了 || 運算子
                let len = data.byteLength || data.size;
                console.log("Binary Data (Length: " + len + "):", data);
                
                // 如果是 ArrayBuffer 或 TypedArray，嘗試印出前 50 個 byte 方便預覽
                // 修正：加入了 || 運算子
                if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
                    // 如果這是一個 view (像是 Uint8Array)，你需要拿到底層的 buffer 或者直接處理
                    const bytes = new Uint8Array(data.buffer ? data.buffer : data);
                    console.log("Binary Preview (First 50 bytes):", Array.from(bytes.slice(0, 50)));
                }
            } else {
                console.log("Other Data Type:", typeof data, data);
            }
            
            // 將最後一次使用的 WebSocket 實例綁定到全域變數，方便你稍後在 Console 手動調用
            // 例如： window.my_ws_instance.send("測試封包")
            window.my_ws_instance = this;
            
        } catch (error) {
            console.error("[Hook Error]:", error);
        }

        // 呼叫原生方法實際送出資料
        return originalSend.apply(this, arguments);
    };

    console.log("%c[System] WebSocket.send Hook installed successfully.", "color: #bada55; font-size: 14px;");
    console.log("%cHint: The latest WebSocket instance is saved to window.my_ws_instance", "color: #ccc;");
})();

// [JSON.parse Hook 腳本]
    (function() {
        // 備份原生的 JSON.parse
        const originalParse = JSON.parse;
        
        // 覆寫 JSON.parse 方法
        JSON.parse = function(text, reviver) {
            try {
                // 呼叫原生方法以獲取解析後的物件
                const result = originalParse.call(this, text, reviver);
                
                // 將攔截到的字串與物件印出在 Console 中
                // 提示：若發現 Console 資訊量太大，可在此處加入 if 條件過濾特定關鍵字
                console.log("=== [Hook] JSON.parse Intercepted ===");
                console.log("Plain Text String:", text);
                console.log("Parsed Object:", result);
                
                return result;
            } catch (error) {
                // 若解析失敗，仍維持原生行為
                return originalParse.call(this, text, reviver);
            }
        };
        
        console.log("[System] JSON.parse Hook installed successfully. Waiting for decrypted data...");
    })();