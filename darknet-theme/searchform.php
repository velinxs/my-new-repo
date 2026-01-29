<?php
/**
 * Search Form Template
 */
?>
<form role="search" method="get" class="search-form" action="<?php echo esc_url(home_url('/')); ?>">
    <label class="screen-reader-text" for="search-field">Search:</label>
    <input type="search"
           id="search-field"
           class="search-field"
           placeholder="Search..."
           value="<?php echo get_search_query(); ?>"
           name="s" />
    <button type="submit" class="search-submit">GO</button>
</form>
