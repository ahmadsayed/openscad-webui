// Console debugging script to check button layout
// Run in browser console at localhost:3000/simple.html

(function() {
    console.log('🐛 Button Layout Debugger');
    console.log('===============');

    function debugButtonLayout() {
        const controls = document.querySelector('.chat-history-controls');
        const refreshBtn = document.getElementById('refreshHistoryBtn');
        const clearBtn = document.getElementById('clearHistoryBtn');

        if (!controls || !refreshBtn || !clearBtn) {
            console.log('❌ Buttons not found (may not be rendered yet)');
            return;
        }

        console.log('📋 Control Container Analysis:');
        console.log('- display:', getComputedStyle(controls).display);
        console.log('- flexDirection:', getComputedStyle(controls).flexDirection);
        console.log('- gap:', getComputedStyle(controls).gap);
        console.log('- width:', getComputedStyle(controls).width);
        console.log('- maxWidth:', getComputedStyle(controls).maxWidth);
        console.log('- padding:', getComputedStyle(controls).padding);

        console.log('\\n🔄 Refresh Button Analysis:');
        console.log('- display:', getComputedStyle(refreshBtn).display);
        console.log('- flex:', getComputedStyle(refreshBtn).flex);
        console.log('- flexBasis:', getComputedStyle(refreshBtn).flexBasis);
        console.log('- flexShrink:', getComputedStyle(refreshBtn).flexShrink);
        console.log('- width:', getComputedStyle(refreshBtn).width);
        console.log('- height:', getComputedStyle(refreshBtn).height);
        console.log('- backgroundColor:', getComputedStyle(refreshBtn).backgroundColor);
        console.log('- margin:', getComputedStyle(refreshBtn).margin);

        console.log('\\n🗑️ Clear Button Analysis:');
        console.log('- display:', getComputedStyle(clearBtn).display);
        console.log('- flex:', getComputedStyle(clearBtn).flex);
        console.log('- flexBasis:', getComputedStyle(clearBtn).flexBasis);
        console.log('- flexShrink:', getComputedStyle(clearBtn).flexShrink);
        console.log('- width:', getComputedStyle(clearBtn).width);
        console.log('- height:', getComputedStyle(clearBtn).height);
        console.log('- backgroundColor:', getComputedStyle(clearBtn).backgroundColor);
        console.log('- margin:', getComputedStyle(clearBtn).margin);

        console.log('\\n🔍 HTML Structure:');
        console.log('Container HTML:', controls.outerHTML);
        console.log('Refresh HTML:', refreshBtn.outerHTML);
        console.log('Clear HTML:', clearBtn.outerHTML);

        console.log('\\n📊 Layout Math:');
        const controlsWidth = controls.offsetWidth;
        const refreshWidth = refreshBtn.offsetWidth;
        const clearWidth = clearBtn.offsetWidth;
        const totalWidth = refreshWidth + clearWidth;
        const button1Top = refreshBtn.offsetTop;
        const button2Top = clearBtn.offsetTop;

        console.log('- Controls width:', controlsWidth);
        console.log('- Total button width:', totalWidth);
        console.log('- Button 1 top:', button1Top);
        console.log('- Button 2 top:', button2Top);
        console.log('- Are buttons horizontally aligned?', Math.abs(button1Top - button2Top) < 5);

        // Apply debug styles to highlight layout
        controls.style.border = '2px dashed red';
        controls.style.position = 'relative';

        refreshBtn.style.border = '2px solid blue';
        clearBtn.style.border = '2px solid green';

        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'position:fixed; top:10px; right:10px; background:yellow; padding:10px; font-family:monospace; z-index:9999; max-width:300px; max-height:300px; overflow:auto;';
        infoDiv.innerHTML = `
            <div style="font-weight:bold">Button Layout Debug</div>
            Controls: ${controls.style.display || 'auto'} / ${getComputedStyle(controls).flexDirection}
            <br>Refresh: ${refreshWidth}px / ${getComputedStyle(refreshBtn).backgroundColor}
            <br>Clear: ${clearWidth}px / ${getComputedStyle(clearBtn).backgroundColor}
            <br><br>Aligned: ${Math.abs(button1Top - button2Top) < 5}
            <br>
            <hr>Problem: Check the console for detailed analysis!
        `;
        document.body.appendChild(infoDiv);

        console.log('\\n✅ Debug overlay added! Check the yellow box in the corner.');
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', debugButtonLayout);
    } else {
        debugButtonLayout();
    }

    // Also run after a short delay in case buttons load dynamically
    setTimeout(debugButtonLayout, 2000);
    setTimeout(debugButtonLayout, 5000);

})();