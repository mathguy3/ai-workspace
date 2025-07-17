#!/usr/bin/env python3
"""
Simple test script to verify LLM Library functionality.
"""

import sys
import time
import psutil
import torch
import threading
from llm_library import LLMLibrary

def get_memory_usage():
    """Get current memory usage in GB."""
    process = psutil.Process()
    memory_gb = process.memory_info().rss / 1024 / 1024 / 1024
    return memory_gb

def thinking_animation(stop_event):
    """Show thinking animation in a separate thread."""
    dots = 0
    while not stop_event.is_set():
        dots = (dots + 1) % 4
        print(f"\rthinking{'.' * dots}", end="", flush=True)
        time.sleep(0.5)
    print("\r", end="", flush=True)  # Clear the line

def test_model_initialization():
    """Test that the model can be loaded successfully."""
    print("Testing model initialization...")
    print(f"Initial memory usage: {get_memory_usage():.2f} GB")
    
    try:
        start_time = time.time()
        llm = LLMLibrary()
        load_time = time.time() - start_time
        
        print(f"✅ Model loaded successfully!")
        print(f"   Model: {llm.model_name}")
        print(f"   Load time: {load_time:.2f} seconds")
        print(f"   Memory usage: {get_memory_usage():.2f} GB")
        
        return llm
        
    except Exception as e:
        print(f"❌ Model initialization failed: {e}")
        return None

def test_response_generation(llm):
    """Test basic response generation."""
    print("\nTesting response generation...")
    
    test_prompts = [
        "Hello, how are you?",
        "What is 2 + 2?",
        "Explain what artificial intelligence is in one sentence."
    ]
    
    for i, prompt in enumerate(test_prompts, 1):
        print(f"\nTest {i}: {prompt}")
        
        try:
            # Start thinking animation
            stop_thinking = threading.Event()
            thinking_thread = threading.Thread(target=thinking_animation, args=(stop_thinking,))
            thinking_thread.daemon = True
            thinking_thread.start()
            
            start_time = time.time()
            response = llm.generate_response(prompt)
            generation_time = time.time() - start_time
            
            # Stop thinking animation
            stop_thinking.set()
            thinking_thread.join(timeout=1)
            
            if response["success"]:
                print(f"✅ Response generated successfully!")
                print(f"   Response: {response['response'][:100]}...")
                print(f"   Generation time: {generation_time:.2f} seconds")
                print(f"   Memory usage: {get_memory_usage():.2f} GB")
            else:
                print(f"❌ Response generation failed: {response['error']}")
                
        except Exception as e:
            # Stop thinking animation on error
            if 'stop_thinking' in locals():
                stop_thinking.set()
                if 'thinking_thread' in locals():
                    thinking_thread.join(timeout=1)
            print(f"❌ Exception during generation: {e}")

def test_memory_efficiency():
    """Test that memory usage stays within reasonable bounds."""
    print("\nTesting memory efficiency...")
    
    initial_memory = get_memory_usage()
    print(f"Initial memory: {initial_memory:.2f} GB")
    
    # Generate multiple responses to test memory stability
    llm = LLMLibrary()
    
    for i in range(5):
        # Start thinking animation
        stop_thinking = threading.Event()
        thinking_thread = threading.Thread(target=thinking_animation, args=(stop_thinking,))
        thinking_thread.daemon = True
        thinking_thread.start()
        
        response = llm.generate_response(f"Test message {i}")
        current_memory = get_memory_usage()
        
        # Stop thinking animation
        stop_thinking.set()
        thinking_thread.join(timeout=1)
        
        print(f"Response {i+1}: {current_memory:.2f} GB")
        
        if current_memory > 30:  # Warning if approaching 32GB limit
            print(f"⚠️  Memory usage high: {current_memory:.2f} GB")
    
    final_memory = get_memory_usage()
    memory_increase = final_memory - initial_memory
    
    print(f"\nMemory test results:")
    print(f"   Initial: {initial_memory:.2f} GB")
    print(f"   Final: {final_memory:.2f} GB")
    print(f"   Increase: {memory_increase:.2f} GB")
    
    if memory_increase < 2:  # Should not increase more than 2GB
        print("✅ Memory usage stable")
    else:
        print("⚠️  Memory usage increased significantly")

def main():
    """Run all tests."""
    print("🚀 LLM Library Test Suite")
    print("=" * 50)
    
    # Check if CUDA is available
    if torch.cuda.is_available():
        print(f"✅ CUDA available: {torch.cuda.get_device_name()}")
        print(f"   GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    else:
        print("⚠️  CUDA not available, using CPU")
    
    # Test 1: Model initialization
    llm = test_model_initialization()
    if llm is None:
        print("❌ Cannot proceed without model initialization")
        sys.exit(1)
    
    # Test 2: Response generation
    test_response_generation(llm)
    
    # Test 3: Memory efficiency
    test_memory_efficiency()
    
    print("\n" + "=" * 50)
    print("✅ All tests completed!")
    print("The LLM Library is ready for development.")

if __name__ == "__main__":
    main() 