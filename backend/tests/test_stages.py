from app.stages import StageTracker


def start(tracker, node_id, title, node_type):
    return tracker.on_node_started({"id": node_id, "title": title, "node_type": node_type})


def finish(tracker, node_id):
    return tracker.on_node_finished({"id": node_id})


def test_keyword_mapping_and_parallel_research():
    t = StageTracker(overrides={})
    assert start(t, "1", "开始", "start") == []
    assert start(t, "2", "抓取公司官网", "tool") == [{"id": "fetch", "status": "running"}]
    assert start(t, "3", "Tavily 搜索", "tool") == [{"id": "search", "status": "running"}]
    [done] = finish(t, "2")
    assert done["id"] == "fetch" and done["status"] == "done"
    assert start(t, "4", "JD 审校", "llm") == [{"id": "review", "status": "running"}]


def test_llm_nodes_without_keywords_fill_stages_in_order():
    t = StageTracker(overrides={})
    ids = []
    for i in range(5):
        events = start(t, f"n{i}", f"LLM{i + 1}", "llm")
        ids.append(events[0]["id"] if events else None)
        finish(t, f"n{i}")
    # 第 5 个节点没有空闲阶段，归入最后一个已开始的阶段（该阶段重新进入 running）
    assert ids == ["analyze", "profile", "draft", "review", "review"]


def test_overrides_take_priority():
    t = StageTracker(overrides={"LLM1": "draft"})
    assert start(t, "a", "LLM1", "llm") == [{"id": "draft", "status": "running"}]


def test_finish_marks_unstarted_as_skipped_and_closes_running():
    t = StageTracker(overrides={})
    start(t, "a", "公司分析", "llm")
    events = {e["id"]: e["status"] for e in t.finish()}
    assert events["analyze"] == "done"
    assert events["fetch"] == "skipped"
    assert events["review"] == "skipped"
